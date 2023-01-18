import csv
import os
import tempfile

import aiofiles

from server import app


def jsonify(records):
    """
    Parse asyncpg record response into JSON format
    """
    list_return = []
    for r in records:
        itens = r.items()
        list_return.append(
            {i[0]: i[1].rstrip() if type(i[1]) == str else i[1] for i in itens}
        )
    return list_return


async def save_file(request):
    # TODO: improve https://stackoverflow.com/a/56656801/2131871
    _, path = tempfile.mkstemp()
    filename = request.files["file"][0].name
    _, suffix = os.path.splitext(filename)

    path += "." + suffix
    try:
        async with aiofiles.open(path, "wb") as f:
            await f.write(request.files["file"][0].body)
    finally:
        print("path", path)
        # os.remove(path)

    return filename, path


def detect_csv_separator(path):
    """
    Automatically detech separator.
    If this doesn't work try the Pandas method.
    https://stackoverflow.com/questions/41235111/customizing-the-separator-in-pandas-read-csv
    """
    with open(path, "r") as csvfile:
        dialect = csv.Sniffer().sniff(csvfile.readline())
        return dialect.delimiter
