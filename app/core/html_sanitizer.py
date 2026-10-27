"""Small allow-list HTML sanitizer for owner-authored blog content."""

from html import escape
from html.parser import HTMLParser
from typing import ClassVar


class _BlogHTMLSanitizer(HTMLParser):
    allowed_tags: ClassVar[set[str]] = {
        "a",
        "blockquote",
        "br",
        "code",
        "del",
        "div",
        "em",
        "figcaption",
        "figure",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "img",
        "li",
        "ol",
        "p",
        "pre",
        "s",
        "span",
        "strong",
        "sub",
        "sup",
        "table",
        "tbody",
        "td",
        "th",
        "thead",
        "tr",
        "u",
        "ul",
    }
    void_tags: ClassVar[set[str]] = {"br", "hr", "img"}
    suppressed_tags: ClassVar[set[str]] = {"iframe", "object", "script", "style", "svg"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.open_tags: list[str] = []
        self.suppressed: list[str] = []

    @staticmethod
    def _safe_url(value: str, *, image: bool = False) -> bool:
        normalized = value.strip().lower()
        if normalized.startswith(("https://", "http://")):
            return True
        if not image and normalized.startswith("mailto:"):
            return True
        return normalized.startswith(("/", "#", "./")) and not normalized.startswith("//")

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.suppressed:
            if tag in self.suppressed_tags:
                self.suppressed.append(tag)
            return
        if tag in self.suppressed_tags:
            self.suppressed.append(tag)
            return
        if tag not in self.allowed_tags:
            return

        safe_attrs: list[str] = []
        for name, value in attrs:
            if value is None:
                continue
            if tag == "a" and name == "href" and self._safe_url(value):
                safe_attrs.append(f'href="{escape(value, quote=True)}"')
            elif tag == "img" and name == "src" and self._safe_url(value, image=True):
                safe_attrs.append(f'src="{escape(value, quote=True)}"')
            elif tag == "img" and name == "alt":
                safe_attrs.append(f'alt="{escape(value, quote=True)}"')
            elif tag == "img" and name == "title":
                safe_attrs.append(f'title="{escape(value, quote=True)}"')

        if tag == "a" and any(attribute.startswith('href="http') for attribute in safe_attrs):
            safe_attrs.append('rel="noopener noreferrer"')
        suffix = f" {' '.join(safe_attrs)}" if safe_attrs else ""
        self.parts.append(f"<{tag}{suffix}>")
        if tag not in self.void_tags:
            self.open_tags.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in self.void_tags:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if self.suppressed:
            if tag == self.suppressed[-1]:
                self.suppressed.pop()
            return
        if tag not in self.open_tags:
            return
        while self.open_tags:
            current = self.open_tags.pop()
            self.parts.append(f"</{current}>")
            if current == tag:
                break

    def handle_data(self, data: str) -> None:
        if not self.suppressed:
            self.parts.append(escape(data))

    def result(self, source: str) -> str:
        self.feed(source)
        self.close()
        while self.open_tags:
            self.parts.append(f"</{self.open_tags.pop()}>")
        return "".join(self.parts)


def sanitize_blog_html(source: str) -> str:
    """Keep basic article formatting while removing scripts and unsafe attributes."""
    return _BlogHTMLSanitizer().result(source)
