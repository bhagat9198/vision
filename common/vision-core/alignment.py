"""
=============================================================================
Face Alignment
=============================================================================
Aligns faces using 5-point landmarks for better embedding quality.
Uses similarity transformation to normalize face orientation.
=============================================================================
"""

import cv2
import numpy as np


# Standard reference landmarks for aligned face (112x112)
# Based on ArcFace alignment standard
REFERENCE_LANDMARKS = np.array([
    [38.2946, 51.6963],   # Left eye
    [73.5318, 51.5014],   # Right eye
    [56.0252, 71.7366],   # Nose
    [41.5493, 92.3655],   # Left mouth
    [70.7299, 92.2041],   # Right mouth
], dtype=np.float32)


def estimate_similarity_transform(
    src_points: np.ndarray,
    dst_points: np.ndarray,
) -> np.ndarray:
    """
    Estimate similarity transformation matrix.
    
    Args:
        src_points: Source landmarks (Nx2)
        dst_points: Destination landmarks (Nx2)
        
    Returns:
        2x3 transformation matrix
    """
    num_points = src_points.shape[0]
    
    # Build matrices for least squares
    src_mean = np.mean(src_points, axis=0)
    dst_mean = np.mean(dst_points, axis=0)
    
    src_centered = src_points - src_mean
    dst_centered = dst_points - dst_mean
    
    # Compute scale
    src_std = np.std(src_centered)
    dst_std = np.std(dst_centered)
    scale = dst_std / src_std if src_std > 0 else 1.0
    
    # Compute rotation
    src_normalized = src_centered / src_std if src_std > 0 else src_centered
    dst_normalized = dst_centered / dst_std if dst_std > 0 else dst_centered
    
    # SVD for rotation
    H = src_normalized.T @ dst_normalized
    U, _, Vt = np.linalg.svd(H)
    R = Vt.T @ U.T
    
    # Ensure proper rotation (det = 1)
    if np.linalg.det(R) < 0:
        Vt[-1, :] *= -1
        R = Vt.T @ U.T
    
    # Build transformation matrix
    transform = np.eye(3)
    transform[:2, :2] = scale * R
    transform[:2, 2] = dst_mean - scale * R @ src_mean
    
    return transform[:2, :]


def align_face(
    image: np.ndarray,
    landmarks: np.ndarray,
    output_size: tuple[int, int] = (112, 112),
) -> np.ndarray:
    """
    Align face using 5-point landmarks.
    
    Args:
        image: BGR image as numpy array
        landmarks: 5x2 array of landmark coordinates
            [left_eye, right_eye, nose, left_mouth, right_mouth]
        output_size: Size of output aligned face
            
    Returns:
        Aligned face image
    """
    # Scale reference landmarks to output size
    scale_x = output_size[0] / 112.0
    scale_y = output_size[1] / 112.0
    scaled_reference = REFERENCE_LANDMARKS.copy()
    scaled_reference[:, 0] *= scale_x
    scaled_reference[:, 1] *= scale_y
    
    # Estimate transformation
    transform = estimate_similarity_transform(landmarks, scaled_reference)
    
    # Apply transformation
    aligned = cv2.warpAffine(
        image,
        transform,
        output_size,
        borderMode=cv2.BORDER_REPLICATE,
    )
    
    return aligned


def align_face_with_padding(
    image: np.ndarray,
    landmarks: np.ndarray,
    bbox: dict,
    output_size: tuple[int, int] = (112, 112),
    padding: float = 0.2,
) -> np.ndarray:
    """
    Align face with additional padding around the face region.
    
    Args:
        image: BGR image as numpy array
        landmarks: 5x2 array of landmark coordinates
        bbox: Bounding box dict with x, y, width, height
        output_size: Size of output aligned face
        padding: Padding ratio around face
            
    Returns:
        Aligned face image with padding
    """
    # Calculate padded bounding box
    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
    pad_x = int(w * padding)
    pad_y = int(h * padding)
    
    # Clamp to image bounds
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(image.shape[1], x + w + pad_x)
    y2 = min(image.shape[0], y + h + pad_y)
    
    # Crop with padding
    cropped = image[y1:y2, x1:x2]
    
    # Adjust landmarks to cropped coordinates
    adjusted_landmarks = landmarks.copy()
    adjusted_landmarks[:, 0] -= x1
    adjusted_landmarks[:, 1] -= y1
    
    # Align the cropped face
    return align_face(cropped, adjusted_landmarks, output_size)

