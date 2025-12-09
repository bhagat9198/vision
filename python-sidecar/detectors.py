"""
=============================================================================
Face Detectors
=============================================================================
YuNet and SCRFD face detection implementations.
=============================================================================
"""

from typing import Optional
import cv2
import numpy as np
import onnxruntime as ort


class YuNetDetector:
    """
    YuNet face detector using OpenCV's FaceDetectorYN.
    Fast and accurate for frontal faces.
    """
    
    def __init__(self, model_path: str, conf_threshold: float = 0.5, nms_threshold: float = 0.3):
        """
        Initialize YuNet detector.
        
        Args:
            model_path: Path to ONNX model file
            conf_threshold: Confidence threshold for detection
            nms_threshold: NMS threshold for overlapping boxes
        """
        self.conf_threshold = conf_threshold
        self.nms_threshold = nms_threshold
        self.model_path = model_path
        self._detector: Optional[cv2.FaceDetectorYN] = None
        self._input_size = (320, 320)
    
    def _get_detector(self, width: int, height: int) -> cv2.FaceDetectorYN:
        """Get or create detector with correct input size."""
        if self._detector is None or self._input_size != (width, height):
            self._input_size = (width, height)
            self._detector = cv2.FaceDetectorYN.create(
                self.model_path,
                "",
                self._input_size,
                self.conf_threshold,
                self.nms_threshold,
            )
        return self._detector
    
    def detect(self, image: np.ndarray) -> list[dict]:
        """
        Detect faces in image.
        
        Args:
            image: BGR image as numpy array
            
        Returns:
            List of face dictionaries with bbox, confidence, landmarks
        """
        height, width = image.shape[:2]
        detector = self._get_detector(width, height)
        
        _, faces = detector.detect(image)
        
        if faces is None:
            return []
        
        results = []
        for face in faces:
            # YuNet output: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
            x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
            confidence = float(face[14])
            
            # Extract landmarks
            landmarks = {
                "right_eye": [float(face[4]), float(face[5])],
                "left_eye": [float(face[6]), float(face[7])],
                "nose": [float(face[8]), float(face[9])],
                "right_mouth": [float(face[10]), float(face[11])],
                "left_mouth": [float(face[12]), float(face[13])],
            }
            
            results.append({
                "bbox": {"x": x, "y": y, "width": w, "height": h},
                "confidence": confidence,
                "landmarks": landmarks,
            })
        
        return results


class SCRFDDetector:
    """
    SCRFD face detector using ONNX Runtime.
    More robust for difficult angles and lighting.
    """
    
    def __init__(self, model_path: str, conf_threshold: float = 0.5, nms_threshold: float = 0.4):
        """
        Initialize SCRFD detector.
        
        Args:
            model_path: Path to ONNX model file
            conf_threshold: Confidence threshold for detection
            nms_threshold: NMS threshold for overlapping boxes
        """
        self.conf_threshold = conf_threshold
        self.nms_threshold = nms_threshold
        
        # Initialize ONNX Runtime session
        self.session = ort.InferenceSession(
            model_path,
            providers=["CPUExecutionProvider"],
        )
        
        # Get input details
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        self.input_size = (640, 640)  # Default input size
    
    def _preprocess(self, image: np.ndarray) -> tuple[np.ndarray, float, tuple[int, int]]:
        """Preprocess image for SCRFD."""
        height, width = image.shape[:2]
        
        # Calculate scale
        scale = min(self.input_size[0] / height, self.input_size[1] / width)
        new_height = int(height * scale)
        new_width = int(width * scale)
        
        # Resize
        resized = cv2.resize(image, (new_width, new_height))
        
        # Pad to input size
        padded = np.zeros((self.input_size[0], self.input_size[1], 3), dtype=np.uint8)
        padded[:new_height, :new_width] = resized
        
        # Normalize and transpose
        blob = padded.astype(np.float32)
        blob = (blob - 127.5) / 128.0
        blob = blob.transpose(2, 0, 1)
        blob = np.expand_dims(blob, axis=0)
        
        return blob, scale, (new_width, new_height)
    
    def detect(self, image: np.ndarray) -> list[dict]:
        """
        Detect faces in image.
        
        Args:
            image: BGR image as numpy array
            
        Returns:
            List of face dictionaries with bbox, confidence, landmarks
        """
        height, width = image.shape[:2]
        print(f"[DEBUG] SCRFD Input Image: {width}x{height}, Threshold: {self.conf_threshold}")

        blob, scale, _ = self._preprocess(image)
        
        # Run inference
        outputs = self.session.run(None, {self.input_name: blob})
        
        # Parse outputs (SCRFD has multiple output heads)
        # This is a simplified version - full implementation would handle all strides
        results = self._parse_outputs(outputs, scale, image.shape[:2])

        return results

    def _parse_outputs(
        self, outputs: list, scale: float, original_size: tuple[int, int]
    ) -> list[dict]:
        """Parse SCRFD model outputs."""
        results = []

        # SCRFD outputs vary by model variant
        # For scrfd_2.5g_bnkps: scores, bboxes, keypoints for each stride
        # Simplified parsing for the 2.5g model

        try:
            # Attempt to parse based on common SCRFD output format
            # The exact parsing depends on the model variant
            if len(outputs) >= 9:
                # Multi-stride output (8, 16, 32)
                # Multi-stride output (8, 16, 32)
                # Logs confirm order: [Scores x3, BBoxes x3, Kps x3]
                strides = [8, 16, 32]
                for i, stride in enumerate(strides):
                    scores = outputs[i]
                    bboxes = outputs[i + 3]
                    keypoints = outputs[i + 6] 

                    self._process_stride(
                        results, scores, bboxes, keypoints,
                        stride, scale, original_size
                    )
            elif len(outputs) == 2:
                # Simple output format: [bboxes, scores]
                bboxes = outputs[0][0]
                scores = outputs[1][0]

                for j, score in enumerate(scores):
                    if score > self.conf_threshold:
                        bbox = bboxes[j]
                        x1, y1, x2, y2 = bbox[:4] / scale

                        results.append({
                            "bbox": {
                                "x": int(x1),
                                "y": int(y1),
                                "width": int(x2 - x1),
                                "height": int(y2 - y1),
                            },
                            "confidence": float(score),
                            "landmarks": None,
                        })
        except Exception as e:
            print(f"Error parsing SCRFD outputs: {e}")

        # Apply NMS
        if results:
            results = self._nms(results)

        return results

    def _process_stride(
        self,
        results: list,
        scores: np.ndarray,
        bboxes: np.ndarray,
        keypoints: np.ndarray,
        stride: int,
        scale: float,
        original_size: tuple[int, int],
    ):
        """Process detections from a single stride with anchor decoding."""
        scores = scores.flatten()
        feat_h = self.input_size[0] // stride
        feat_w = self.input_size[1] // stride
        num_anchors = len(scores) // (feat_h * feat_w)
        
        # DEBUG: Log decoding params
        # print(f"[DEBUG] Decoding Stride {stride}: {feat_w}x{feat_h} map, {num_anchors} anchors/pixel")

        for j, score in enumerate(scores):
            if score > self.conf_threshold:
                # 1. Calculate anchor center
                # Assuming layout (H, W, A) flattened
                pixel_idx = j // num_anchors
                grid_y = pixel_idx // feat_w
                grid_x = pixel_idx % feat_w
                
                cx = grid_x * stride
                cy = grid_y * stride

                # 2. Decode bounding box (distance from center)
                # bboxes[j] = [l, t, r, b] * stride
                offsets = bboxes[j]
                
                x1 = (cx - offsets[0] * stride) / scale
                y1 = (cy - offsets[1] * stride) / scale
                x2 = (cx + offsets[2] * stride) / scale
                y2 = (cy + offsets[3] * stride) / scale

                # 3. Decode keypoints
                # kps[j] = [x1, y1, x2, y2, ...] * stride
                landmarks = None
                if keypoints is not None and keypoints.size > 0:
                    kps_offsets = keypoints[j].reshape(-1, 2)
                    landmarks = {}
                    # Keypoints are typically offsets from cx, cy too? 
                    # Or absolute coords in feature map? 
                    # Usually: kp_x = cx + offset_x * stride
                    
                    raw_kps = []
                    for k in range(5):
                         kx = (cx + kps_offsets[k][0] * stride) / scale
                         ky = (cy + kps_offsets[k][1] * stride) / scale
                         raw_kps.append([kx, ky])
                    
                    landmarks = {
                        "left_eye": raw_kps[0],
                        "right_eye": raw_kps[1],
                        "nose": raw_kps[2],
                        "left_mouth": raw_kps[3],
                        "right_mouth": raw_kps[4],
                    }

                results.append({
                    "bbox": {
                        "x": int(max(0, x1)),
                        "y": int(max(0, y1)),
                        "width": int(min(original_size[1], x2) - max(0, x1)),
                        "height": int(min(original_size[0], y2) - max(0, y1)),
                    },
                    "confidence": float(score),
                    "landmarks": landmarks,
                })

    def _nms(self, faces: list[dict]) -> list[dict]:
        """Apply non-maximum suppression."""
        if not faces:
            return []

        # Convert to arrays for NMS
        boxes = np.array([
            [f["bbox"]["x"], f["bbox"]["y"],
             f["bbox"]["x"] + f["bbox"]["width"],
             f["bbox"]["y"] + f["bbox"]["height"]]
            for f in faces
        ])
        scores = np.array([f["confidence"] for f in faces])

        # Apply OpenCV NMS
        indices = cv2.dnn.NMSBoxes(
            boxes.tolist(),
            scores.tolist(),
            self.conf_threshold,
            self.nms_threshold,
        )

        if len(indices) == 0:
            return []

        return [faces[i] for i in indices.flatten()]

