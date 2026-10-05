KANNADA_FILLERS = {
    "ಅಂ", "ಆ", "ಅಂದರೆ", "ಅಂದ್ರೆ", "ಹಾಗೆ", "ಅಲ್ವಾ", "ಅದು", "ಅಂದ್ಕೊಂಡು"
}

def find_filler_ranges(words):
    ranges = []
    for word in words:
        normalized = word["text"].strip().strip(".,!?;:").lower()
        if normalized in KANNADA_FILLERS:
            ranges.append({
                "start": word["start"],
                "end": word["end"],
                "reason": "filler"
            })
    return ranges
