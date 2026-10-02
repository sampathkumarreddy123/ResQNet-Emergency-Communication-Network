"""Cyclic Redundancy Check (CRC) Error Detection Implementation.

Implements binary modulo-2 polynomial division using XOR logic.
Provides encoding, step-by-step division trace, verification, and corruption injection.
"""

from typing import Dict, List, Any, Tuple


CRC_PRESETS = {
    "CRC-4": "10011",
    "CRC-8": "100000111",
    "CRC-16": "11000000000000101",
    "CRC-CCITT": "10001000000100001",
    "CRC-32": "100000100110000010001110110110111"
}


def _xor(a: str, b: str) -> str:
    """Perform bitwise XOR between two equal-length binary strings."""
    result = []
    for bit_a, bit_b in zip(a, b):
        result.append("1" if bit_a != bit_b else "0")
    return "".join(result)


def _modulo2_division(dividend: str, divisor: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Perform modulo-2 binary polynomial division.

    Args:
        dividend: Binary string to divide.
        divisor: Binary string generator polynomial.

    Returns:
        Tuple of (remainder, step_traces).
    """
    pick = len(divisor)
    tmp = dividend[0:pick]
    steps: List[Dict[str, Any]] = []
    step_num = 1

    while pick < len(dividend):
        if tmp[0] == "1":
            quotient_bit = "1"
            xor_result = _xor(tmp, divisor)
            # Remove leading bit and pull down next bit from dividend
            next_bit = dividend[pick]
            next_tmp = xor_result[1:] + next_bit
            steps.append({
                "step": step_num,
                "current_bits": tmp,
                "divisor": divisor,
                "xor_result": xor_result,
                "pulled_bit": next_bit,
                "next_bits": next_tmp,
                "quotient_bit": quotient_bit
            })
            tmp = next_tmp
        else:
            quotient_bit = "0"
            zeros = "0" * len(divisor)
            xor_result = _xor(tmp, zeros)
            next_bit = dividend[pick]
            next_tmp = xor_result[1:] + next_bit
            steps.append({
                "step": step_num,
                "current_bits": tmp,
                "divisor": zeros,
                "xor_result": xor_result,
                "pulled_bit": next_bit,
                "next_bits": next_tmp,
                "quotient_bit": quotient_bit
            })
            tmp = next_tmp
        pick += 1
        step_num += 1

    # Last step when no more bits to pull down
    if tmp[0] == "1":
        xor_result = _xor(tmp, divisor)
        steps.append({
            "step": step_num,
            "current_bits": tmp,
            "divisor": divisor,
            "xor_result": xor_result,
            "pulled_bit": None,
            "next_bits": xor_result[1:],
            "quotient_bit": "1"
        })
        remainder = xor_result[1:]
    else:
        zeros = "0" * len(divisor)
        xor_result = _xor(tmp, zeros)
        steps.append({
            "step": step_num,
            "current_bits": tmp,
            "divisor": zeros,
            "xor_result": xor_result,
            "pulled_bit": None,
            "next_bits": xor_result[1:],
            "quotient_bit": "0"
        })
        remainder = xor_result[1:]

    return remainder, steps


def validate_binary_string(val: str, name: str = "Input") -> None:
    """Validate that string is non-empty and contains only '0' and '1'."""
    if not val or not isinstance(val, str):
        raise ValueError(f"{name} must be a non-empty binary string.")
    cleaned = val.strip().replace(" ", "")
    if not all(ch in "01" for ch in cleaned):
        raise ValueError(f"{name} contains invalid characters; only '0' and '1' allowed.")
    if len(cleaned) == 0:
        raise ValueError(f"{name} cannot be empty.")


def crc_encode(data_bits: str, generator: str) -> Dict[str, Any]:
    """Encode binary data using CRC polynomial division.

    Args:
        data_bits: Binary string of payload data.
        generator: Binary string generator polynomial (must start with '1').

    Returns:
        Dictionary with original data, generator, remainder, codeword, and division steps.
    """
    data_bits = data_bits.strip().replace(" ", "")
    generator = generator.strip().replace(" ", "")

    validate_binary_string(data_bits, "Data bits")
    validate_binary_string(generator, "Generator polynomial")

    if generator[0] != "1":
        raise ValueError("Generator polynomial must start with a leading '1'.")
    if len(generator) < 2:
        raise ValueError("Generator polynomial length must be at least 2 bits.")

    # Degree of polynomial r = len(generator) - 1
    degree = len(generator) - 1
    appended_data = data_bits + ("0" * degree)

    remainder, steps = _modulo2_division(appended_data, generator)
    codeword = data_bits + remainder

    return {
        "data_bits": data_bits,
        "generator": generator,
        "degree": degree,
        "appended_data": appended_data,
        "remainder": remainder,
        "codeword": codeword,
        "steps": steps
    }


def crc_verify(received_codeword: str, generator: str) -> Dict[str, Any]:
    """Verify received codeword using CRC polynomial division.

    Args:
        received_codeword: Binary string received at receiver.
        generator: Generator polynomial.

    Returns:
        Dictionary with remainder, is_valid flag, and error status.
    """
    received_codeword = received_codeword.strip().replace(" ", "")
    generator = generator.strip().replace(" ", "")

    validate_binary_string(received_codeword, "Received codeword")
    validate_binary_string(generator, "Generator polynomial")

    remainder, steps = _modulo2_division(received_codeword, generator)
    is_valid = all(bit == "0" for bit in remainder)

    return {
        "received_codeword": received_codeword,
        "generator": generator,
        "remainder": remainder,
        "is_valid": is_valid,
        "error_detected": not is_valid,
        "steps": steps
    }


def inject_error(codeword: str, bit_index: int) -> str:
    """Invert the bit at the given 0-based position in the codeword.

    Args:
        codeword: Original binary codeword.
        bit_index: 0-based index to flip.

    Returns:
        Corrupted binary codeword.
    """
    validate_binary_string(codeword, "Codeword")
    if bit_index < 0 or bit_index >= len(codeword):
        raise IndexError(f"Bit index {bit_index} out of range (0 to {len(codeword) - 1}).")

    flipped = "1" if codeword[bit_index] == "0" else "0"
    return codeword[:bit_index] + flipped + codeword[bit_index + 1:]
