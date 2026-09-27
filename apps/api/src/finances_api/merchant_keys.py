def normalize_merchant_key(raw_description: str) -> str:
    return " ".join(raw_description.split()).upper()
