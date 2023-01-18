from sanic.response import json
from sqlalchemy.engine import make_url

import database
from server import app
from upload import import_file
from utils import jsonify, save_file


@app.route("/")
async def root(request):
    return json({"hello": "world"})


@app.route("/upload", methods=["POST"])
async def req_upload(request):
    filename, path = await save_file(request)
    print("filename", filename)
    table_name = filename.split(".")[0].lower()

    database_name = request.args.get("database")
    username = request.args.get("user")
    password = request.args.get("password")
    uri = make_url(database.URI)
    uri = uri.set(database=database_name, username=username, password=password)
    import_file(uri, path, table_name)
    return json({"success": True})


@app.route("/test")
async def test(request):
    pool = request.app.config["pool"]
    async with pool.acquire() as conn:
        sql = """
                SELECT 2 as "foo";
            """
        rows = await conn.fetch(sql)
        print(rows)
        return json({"status": 200, "data": jsonify(rows)}, status=200)


if __name__ == "__main__":
    app.run(host="0.0.0.0")
