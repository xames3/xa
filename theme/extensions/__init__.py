"""\
Theme Extension Manager
=======================

Author: Akshay Mestry <xa@mes3.dev>
Created on: 22 February, 2025
Last updated on: 02 November, 2025

This module manages this theme's custom directive and roles.

.. deprecated:: 19.10.2025

    The `tagged` directive is now deprecated as it didn't serve any
    specific purpose or was being used in any way.
"""

from __future__ import annotations

import typing as t

from . import author
from . import picture
from . import repository
from . import thumbnail
from . import video
from . import youtube

if t.TYPE_CHECKING:
    import types

directives: t.Sequence[types.ModuleType] = (
    author,
    picture,
    repository,
    thumbnail,
    video,
    youtube,
)
