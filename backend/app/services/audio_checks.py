import struct

from fastapi import HTTPException

SUPPORTED_PREFIXES = (b"RIFF", b"OggS", b"ID3", b"fLaC")


def validate_audio(data: bytes, max_bytes: int) -> None:
    if not data:
        raise HTTPException(status_code=400, detail="Audio file is empty. Please record again.")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio file is too large.")
    if data.startswith(b"RIFF") and data[8:12] == b"WAVE":
        duration = wav_duration_seconds(data)
        if duration is not None and duration > 30:
            raise HTTPException(
                status_code=400,
                detail="Gnani REST transcription accepts audio up to 30 seconds. Please record a shorter clip.",
            )
        return
    if data[:3] == b"ID3" or data[:2] == b"\xff\xfb" or data.startswith(SUPPORTED_PREFIXES):
        return
    if data[4:8] == b"ftyp":
        return
    raise HTTPException(
        status_code=400,
        detail="Unsupported audio. Send WAV, MP3, OGG, FLAC, AAC, or M4A, as required by the Gnani REST API.",
    )


def wav_duration_seconds(data: bytes) -> float | None:
    if len(data) < 44 or data[0:4] != b"RIFF" or data[8:12] != b"WAVE":
        return None
    offset = 12
    sample_rate = None
    block_align = None
    data_size = None
    while offset + 8 <= len(data):
        chunk_id = data[offset : offset + 4]
        chunk_size = struct.unpack_from("<I", data, offset + 4)[0]
        chunk_start = offset + 8
        if chunk_id == b"fmt " and chunk_size >= 16 and chunk_start + 16 <= len(data):
            sample_rate = struct.unpack_from("<I", data, chunk_start + 4)[0]
            block_align = struct.unpack_from("<H", data, chunk_start + 12)[0]
        elif chunk_id == b"data":
            data_size = chunk_size
            break
        offset = chunk_start + chunk_size + (chunk_size % 2)
    if not sample_rate or not block_align or data_size is None:
        return None
    return data_size / float(sample_rate * block_align)
