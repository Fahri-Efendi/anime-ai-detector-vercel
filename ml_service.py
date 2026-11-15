"""ONNX Runtime inference service for Anime AI Detector.

Uses the exported MobileNetV3-Small checkpoint at models/best_model.onnx.
Preprocessing and class mapping must stay aligned with the Colab training notebook:
AI-generated = 0, Human = 1; RGB; square padding to 224x224; ImageNet normalization.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageOps

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "best_model.onnx"
IMAGE_SIZE = 224
IMAGENET_MEAN = np.asarray((0.485, 0.456, 0.406), dtype=np.float32).reshape(1, 3, 1, 1)
IMAGENET_STD = np.asarray((0.229, 0.224, 0.225), dtype=np.float32).reshape(1, 3, 1, 1)
CLASS_TO_IDX = {"ai": 0, "human": 1}

_session = None
_input_name: str | None = None
_output_name: str | None = None


class ModelNotReadyError(RuntimeError):
    """Raised when the exported ONNX model is not available."""


def load_model():
    """Load ONNX Runtime session once and reuse it across requests."""
    global _session, _input_name, _output_name

    if _session is not None:
        return _session

    if not MODEL_PATH.is_file():
        raise ModelNotReadyError(
            "Model ONNX belum tersedia. Letakkan best_model.onnx di folder models."
        )

    try:
        import onnxruntime as ort
    except ImportError as exc:
        raise RuntimeError(
            "ONNX Runtime belum terpasang. Jalankan: pip install -r requirements.txt"
        ) from exc

    options = ort.SessionOptions()
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    # Conservative setting for small servers and laptop testing.
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1

    try:
        session = ort.InferenceSession(
            str(MODEL_PATH),
            sess_options=options,
            providers=["CPUExecutionProvider"],
        )
    except Exception as exc:
        raise RuntimeError(f"Model ONNX gagal dimuat: {exc}") from exc

    inputs = session.get_inputs()
    outputs = session.get_outputs()
    if len(inputs) != 1 or len(outputs) != 1:
        raise RuntimeError("Model ONNX harus memiliki satu input dan satu output.")

    input_shape = inputs[0].shape
    output_shape = outputs[0].shape
    if len(input_shape) != 4:
        raise RuntimeError(f"Bentuk input ONNX tidak sesuai: {input_shape}")
    if len(output_shape) != 2 or output_shape[-1] != 2:
        raise RuntimeError(f"Bentuk output ONNX tidak sesuai untuk 2 kelas: {output_shape}")

    _session = session
    _input_name = inputs[0].name
    _output_name = outputs[0].name
    return _session


def _preprocess(image: Image.Image) -> np.ndarray:
    """Match the evaluation preprocessing used by the Colab notebook."""
    resampling = getattr(Image, "Resampling", Image).BICUBIC
    square = ImageOps.pad(
        image.convert("RGB"),
        (IMAGE_SIZE, IMAGE_SIZE),
        method=resampling,
        color=(127, 127, 127),
        centering=(0.5, 0.5),
    )

    array = np.asarray(square, dtype=np.float32) / 255.0  # HWC, RGB, [0, 1]
    array = np.transpose(array, (2, 0, 1))[None, ...]  # NCHW: [1, 3, 224, 224]
    array = (array - IMAGENET_MEAN) / IMAGENET_STD
    return np.ascontiguousarray(array, dtype=np.float32)


def predict_image(image: Image.Image) -> dict[str, Any]:
    """Return the same response structure as the previous PyTorch service."""
    session = load_model()
    tensor = _preprocess(image)

    logits = session.run([_output_name], {_input_name: tensor})[0]
    logits = np.asarray(logits, dtype=np.float32)
    if logits.shape != (1, 2):
        raise RuntimeError(f"Output model tidak sesuai: {logits.shape}")

    # Stable softmax over the two output logits.
    shifted = logits[0] - np.max(logits[0])
    exp_values = np.exp(shifted)
    probabilities = exp_values / np.sum(exp_values)

    index_to_class = {0: "ai", 1: "human"}
    predicted_index = int(np.argmax(probabilities))
    predicted_class = index_to_class[predicted_index]
    display_label = "AI-generated" if predicted_class == "ai" else "Human"

    return {
        "predicted_label": display_label,
        "predicted_class": predicted_class,
        "confidence": float(probabilities[predicted_index]),
        "scores": {
            "AI-generated": float(probabilities[CLASS_TO_IDX["ai"]]),
            "Human": float(probabilities[CLASS_TO_IDX["human"]]),
        },
        "score_note": "Skor softmax model, bukan kepastian asal-usul gambar.",
    }
