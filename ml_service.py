"""Lazy-loaded MobileNetV3-Small inference service.

The trained checkpoint is created by training/colab_training.ipynb and should be
copied to models/best_model.pth. No prediction is fabricated when the checkpoint
is missing.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from PIL import Image, ImageOps

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "best_model.pth"
IMAGE_SIZE = 224
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

_model = None
_class_to_idx: dict[str, int] | None = None
_torch = None


class ModelNotReadyError(RuntimeError):
    """Raised when no trained model checkpoint is available."""


def _build_model():
    try:
        import torch.nn as nn
        from torchvision import models
    except ImportError as exc:
        raise RuntimeError(
            "Library ML belum terpasang. Jalankan: pip install -r requirements.txt"
        ) from exc

    model = models.mobilenet_v3_small(weights=None)
    last_layer = model.classifier[3]
    model.classifier[3] = nn.Linear(last_layer.in_features, 2)
    return model


def load_model():
    """Load the trained model once and cache it in memory for later requests."""
    global _model, _class_to_idx, _torch

    if _model is not None:
        return _model, _class_to_idx

    if not MODEL_PATH.is_file():
        raise ModelNotReadyError(
            "Model belum tersedia. Latih model melalui training/colab_training.ipynb, "
            "lalu letakkan best_model.pth ke folder models."
        )

    try:
        import torch
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch belum terpasang. Jalankan: pip install -r requirements.txt"
        ) from exc

    checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    if checkpoint.get("architecture") != "mobilenet_v3_small":
        raise RuntimeError("Arsitektur model pada checkpoint tidak dikenali.")

    class_to_idx = checkpoint.get("class_to_idx")
    if class_to_idx != {"ai": 0, "human": 1}:
        raise RuntimeError(
            "Urutan kelas checkpoint tidak sesuai. Seharusnya {'ai': 0, 'human': 1}. "
            "Periksa folder dataset dan notebook training."
        )

    model = _build_model()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    _model = model
    _class_to_idx = class_to_idx
    _torch = torch
    return _model, _class_to_idx


def _preprocess(image: Image.Image):
    """Match the preprocessing used in the Colab notebook; preserve aspect ratio."""
    import numpy as np

    # Pad to square instead of stretching/cropping the artwork.
    resampling = getattr(Image, "Resampling", Image).BICUBIC
    square = ImageOps.pad(
        image.convert("RGB"),
        (IMAGE_SIZE, IMAGE_SIZE),
        method=resampling,
        color=(127, 127, 127),
        centering=(0.5, 0.5),
    )
    array = np.asarray(square, dtype=np.float32) / 255.0
    tensor = _torch.from_numpy(array).permute(2, 0, 1)
    mean = _torch.tensor(IMAGENET_MEAN, dtype=tensor.dtype).view(3, 1, 1)
    std = _torch.tensor(IMAGENET_STD, dtype=tensor.dtype).view(3, 1, 1)
    return ((tensor - mean) / std).unsqueeze(0)


def predict_image(image: Image.Image) -> dict[str, Any]:
    """Return a model prediction and softmax scores for a PIL image."""
    model, class_to_idx = load_model()
    tensor = _preprocess(image)

    with _torch.inference_mode():
        logits = model(tensor)
        probabilities = _torch.softmax(logits, dim=1)[0]

    index_to_class = {index: name for name, index in class_to_idx.items()}
    predicted_index = int(probabilities.argmax().item())
    predicted_class = index_to_class[predicted_index]
    display_label = "AI-generated" if predicted_class == "ai" else "Human"

    return {
        "predicted_label": display_label,
        "predicted_class": predicted_class,
        "confidence": float(probabilities[predicted_index].item()),
        "scores": {
            "AI-generated": float(probabilities[class_to_idx["ai"]].item()),
            "Human": float(probabilities[class_to_idx["human"]].item()),
        },
        "score_note": "Skor softmax model, bukan kepastian asal-usul gambar.",
    }
