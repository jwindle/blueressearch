from docsearch.core.extractor import Extractor


def _extract_traits(
    data: dict, field: str
) -> list[tuple[str, str | None]]:
    results = []
    for i, trait in enumerate(data.get(field) or []):
        for j, value in enumerate(trait.get("values") or []):
            if value and value.strip():
                results.append((value, f"[{i}].values[{j}]"))
    return results


def _concat_traits(
    data: dict, field: str
) -> list[tuple[str, str | None]]:
    results = []
    for i, trait in enumerate(data.get(field) or []):
        values = [v for v in (trait.get("values") or []) if v and v.strip()]
        if values:
            results.append((" ".join(values), f"[{i}].values"))
    return results


def _extract_field(data: dict, field: str) -> list[tuple[str, str | None]]:
    value = data.get(field)
    if value and str(value).strip():
        return [(str(value), None)]
    return []


class ShortDescriptionExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Short Description"

    def get_keys(self) -> list[str]:
        return ["shortDescription"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _extract_field(data, "shortDescription")


class LongDescriptionExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Long Description"

    def get_keys(self) -> list[str]:
        return ["longDescription"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _extract_field(data, "longDescription")


class JobTitleExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Job Title"

    def get_keys(self) -> list[str]:
        return ["jobTitle"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _extract_field(data, "jobTitle")


class EmployeeTraitsExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Employee Traits"

    def get_keys(self) -> list[str]:
        return ["employeeTraits"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _extract_traits(data, "employeeTraits")


class JobTraitsExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Job Traits"

    def get_keys(self) -> list[str]:
        return ["jobTraits"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _extract_traits(data, "jobTraits")


class EmployeeTraitsConcatExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Employee Traits Concat"

    def get_keys(self) -> list[str]:
        return ["employeeTraits"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _concat_traits(data, "employeeTraits")


class JobTraitsConcatExtractor(Extractor):
    @property
    def name(self) -> str:
        return "Job Traits Concat"

    def get_keys(self) -> list[str]:
        return ["jobTraits"]

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        return _concat_traits(data, "jobTraits")
