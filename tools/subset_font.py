#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 HarmonyOS Sans SC 可变字体子集化成站内用得到的字符，输出 woff2。

调用方式见 tools/subset-font.mjs（它会先把站内用到的字符收集成一个文本文件）。

用法：python tools/subset_font.py <源字体.ttf> <字符清单.txt> <输出.woff2>
"""

import sys

from fontTools import subset


def main():
    if len(sys.argv) != 4:
        print('用法：python tools/subset_font.py <源字体> <字符清单> <输出.woff2>')
        return 2

    src, chars_path, out = sys.argv[1], sys.argv[2], sys.argv[3]

    with open(chars_path, 'r', encoding='utf-8') as fh:
        text = fh.read()

    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']       # 保留字距、标点挤压这些排版特性
    options.name_IDs = ['*']              # 保留版权与许可信息，别把作者抹掉
    options.name_languages = ['*']
    options.notdef_outline = True
    options.recalc_bounds = True
    options.recalc_timestamp = False
    options.desubroutinize = False
    options.drop_tables = []

    font = subset.load_font(src, options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    subset.save_font(font, out, options)

    print('字形数：%d' % len(font.getGlyphOrder()))
    return 0


if __name__ == '__main__':
    sys.exit(main())
