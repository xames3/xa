"""\
Custom Roles
============

Author: Akshay Mestry <xa@mes3.dev>
Created on: 21 February, 2025
Last updated on: 24 December, 2025

This module provides custom roles for this sphinx theme that provides a
way to add features to the document.
"""

from __future__ import annotations

import typing as t

import docutils.nodes as nodes


def stylise(
    role: str,
    rawtext: str,
    text: str,
    lineno: int,
    inliner: t.Any,
    options: dict[str, t.Any] | None = None,
    content: list[t.Any] | None = None,
) -> tuple[list[nodes.Node], list[nodes.system_message]]:
    """Apply inline styling to text.

    This function allows for applying a CSS style to a piece of text
    within reStructuredText using a role syntax. The expected input
    format is `text <style>`. If the input format is invalid, an error
    is reported.

    Example::

        .. code-block:: rst

            Text is normal, but now its in :style:`red <color: red;>`.

    :param role: The role name used in the source text.
    :param rawtext: The entire markup text representing the role.
    :param text: The text by the user.
    :param lineno: The line number where the role was encountered in the
        source text.
    :param inliner: The inliner instance that called the role function.
    :param options: Additional options passed to the role function,
        defaults to `None`.
    :param content: Content passed to the role function, defaults
        to `None`.
    :return: A tuple of list with a single `nodes.raw` object
        representing the styled text and a list of system messages
        generated during processing (typically empty if no errors).
    :raises: None, but will report an error message if the input format
        is invalid.
    """
    # NOTE(xames3): The parameters `role`, `options`, and `content` are
    # currently unused but are included to match the expected signature
    # for a Sphinx role function.
    role = role or ""
    options = options or {}
    content = content or []
    try:
        element, style = map(str.strip, text.split("<", 1))
        style = style.rstrip(">")
    except ValueError:
        msg = inliner.reporter.error(
            f"Invalid style: {text!r}",
            nodes.literal_block(rawtext, rawtext),
            line=lineno,
        )
        return [inliner.problematic(rawtext, rawtext, msg)], [msg]
    raw = f'<span style="{style}">{element}</span>'
    return [nodes.raw(text=raw, format="html")], []


def email(
    role: str,
    rawtext: str,
    text: str,
    lineno: int,
    inliner: t.Any,
    options: dict[str, t.Any] | None = None,
    content: list[t.Any] | None = None,
) -> tuple[list[nodes.Node], list[nodes.system_message]]:
    """Create a `mailto` link.

    This function generates a `mailto` link. By default, it populates
    the subject with the current page's title, but it can be overridden
    these defaults directly in the role.

    Example::

        .. code-block:: rst

            Send me an :email:`email <xa@mes3.dev>`.

        .. code-block:: rst

            Send me an :email:`email <xa@mes3.dev | Hello hello!!>`

    :param role: The role name used in the source text.
    :param rawtext: The entire markup text representing the role.
    :param text: The text by the user, which becomes the link text.
    :param lineno: The line number where the role was encountered in the
        source text.
    :param inliner: The inliner instance that called the role function.
    :param options: Additional options passed to the role function,
        defaults to `None`.
    :param content: Content passed to the role function, defaults
        to `None`.
    :return: A tuple of list with a single `nodes.raw` object
        representing the styled text and a list of system messages
        generated during processing (typically empty if no errors).
    :raises: None, but will report an error message if the input format
        is invalid.
    """
    # NOTE(xames3): The parameters `role`, `options`, and `content` are
    # currently unused but are included to match the expected signature
    # for a Sphinx role function.
    role = role or ""
    options = options or {}
    content = content or []
    titles = inliner.document.traverse(nodes.title)
    href, rest = text.split("<", 1)
    href = href.strip()
    if "|" in rest:
        href, subject = (t.strip() for t in rest.split("|", 1))
    else:
        subject = titles[0].children[-1].astext().strip()
    refuri = f"mailto:{rest.rstrip('>').strip()}?subject={subject}"
    return [nodes.reference(rawtext, href, refuri=refuri, line=lineno)], []
