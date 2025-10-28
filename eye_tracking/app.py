from flask import Flask
app = Flask(__name__)

@app.route('/', methods=['GET'])
def home(data):
    json_data = data.get_json()


if __name__ == '__main__':
    app.run(debug=True)