from docsearch.core.extractor import Extractor


class BasicsLabelExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Label"

    def get_keys(self) -> list[str]:
        return ["basics.label"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        value = (data.get("basics") or {}).get("label", "")
        return [(value, None)] if value and value.strip() else []


class BasicsSummaryExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Summary"

    def get_keys(self) -> list[str]:
        return ["basics.summary"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        value = (data.get("basics") or {}).get("summary", "")
        return [(value, None)] if value and value.strip() else []


class WorkExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Work"

    def get_keys(self) -> list[str]:
        return ["work"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        results = []
        for i, entry in enumerate(data.get("work") or []):
            summary = entry.get("summary")
            if summary and summary.strip():
                results.append((summary, f"[{i}].summary"))
            for j, highlight in enumerate(entry.get("highlights") or []):
                if highlight and highlight.strip():
                    results.append((highlight, f"[{i}].highlights[{j}]"))
        return results


class EducationExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Education"

    def get_keys(self) -> list[str]:
        return ["education"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        results = []
        for i, entry in enumerate(data.get("education") or []):
            parts = [entry.get("institution"), entry.get("area"), entry.get("studyType")]
            text = ", ".join(p for p in parts if p and p.strip())
            if text:
                results.append((text, f"[{i}]"))
        return results


class SkillsExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Skills"

    def get_keys(self) -> list[str]:
        return ["skills"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        results = []
        for i, skill in enumerate(data.get("skills") or []):
            name = skill.get("name")
            keywords = skill.get("keywords") or []
            parts = [str(keyword) for keyword in keywords if str(keyword).strip()]
            text = f"{name}: {'; '.join(parts)}" if name and str(name).strip() else "; ".join(parts)
            if text.strip():
                results.append((text, f"[{i}]"))
        return results


class WorkConcatExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Work Concat"

    def get_keys(self) -> list[str]:
        return ["work"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        results = []
        for i, entry in enumerate(data.get("work") or []):
            parts = []
            summary = entry.get("summary")
            if summary and summary.strip():
                parts.append(summary)
            for highlight in entry.get("highlights") or []:
                if highlight and highlight.strip():
                    parts.append(highlight)
            if parts:
                results.append((" ".join(parts), f"[{i}]"))
        return results
