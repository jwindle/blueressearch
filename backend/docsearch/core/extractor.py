import string
from abc import ABC, abstractmethod


class Extractor(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def get_keys(self) -> list[str]:
        pass

    @abstractmethod
    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        pass

    @property
    def class_name(self) -> str:
        return type(self).__name__

    def get_config(self) -> dict | None:
        return None


class ConcatExtractor(Extractor):
    """Concatenate one or more fields with a separator. Produces one text per document."""

    def __init__(self, name: str, fields: list[str], separator: str = " ") -> None:
        self._name = name
        self._fields = fields
        self._separator = separator

    @property
    def name(self) -> str:
        return self._name

    def get_keys(self) -> list[str]:
        return list(self._fields)

    def get_config(self) -> dict:
        return {"fields": self._fields, "separator": self._separator}

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        parts = [str(data[f]) for f in self._fields if data.get(f) is not None]
        return [(self._separator.join(parts), None)] if parts else []


class TemplateExtractor(Extractor):
    """Format a Python str template against the document. Produces one text per document.

    Field names are derived from the template placeholders, e.g. "{title} — {abstract}".
    Missing keys are rendered as empty strings.
    """

    def __init__(self, name: str, template: str) -> None:
        self._name = name
        self._template = template
        self._fields: list[str] = [
            fname
            for _, fname, _, _ in string.Formatter().parse(template)
            if fname is not None
        ]

    @property
    def name(self) -> str:
        return self._name

    def get_keys(self) -> list[str]:
        return list(self._fields)

    def get_config(self) -> dict:
        return {"template": self._template}

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        values = {k: (data.get(k) or "") for k in self._fields}
        text = self._template.format_map(values)
        return [(text, None)] if text.strip() else []


class ArrayExtractor(Extractor):
    """Embed each item of a JSON array as a separate text. Produces one text per item.

    array_field  — top-level key holding the array
    text_field   — key within each item to use as text (omit if items are plain strings)
    subkey_field — key within each item to use as the subkey (defaults to array index)
    """

    def __init__(
        self,
        name: str,
        array_field: str,
        text_field: str | None = None,
        subkey_field: str | None = None,
    ) -> None:
        self._name = name
        self._array_field = array_field
        self._text_field = text_field
        self._subkey_field = subkey_field

    @property
    def name(self) -> str:
        return self._name

    def get_keys(self) -> list[str]:
        return [self._array_field]

    def get_config(self) -> dict:
        return {
            "array_field": self._array_field,
            "text_field": self._text_field,
            "subkey_field": self._subkey_field,
        }

    def extract_texts(self, data: dict) -> list[tuple[str, str | None]]:
        items = data.get(self._array_field) or []
        result = []
        for i, item in enumerate(items):
            text = str(item.get(self._text_field, "")) if self._text_field else str(item)
            subkey = str(item.get(self._subkey_field)) if self._subkey_field else str(i)
            if text.strip():
                result.append((text, subkey))
        return result
