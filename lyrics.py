import json
from musicxmatch_api import MusixMatchAPI
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
api = MusixMatchAPI()

def fetch_track_info(song):
    try:
        track_list = api.search_tracks(song)["message"]["body"]["track_list"]

        if not track_list:
            return None
        
        return {
            'track_id': track_list[0]["track"]["track_id"],
            'track_length': track_list[0]["track"]["track_length"]
        }
    except (KeyError, IndexError, TypeError):
        return None

def fetch_lyrics(track_id):
    try:
        search = api.get_track_richsync(track_id=track_id)
        lyrics = search["message"]["body"]["richsync"]["richsync_body"]
        return lyrics
    except (KeyError, TypeError):
        return None

@app.route('/get-track-info', methods=['POST'])
def get_track_id():
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No osu! song provided ಠ_ಠ'}), 400
    
    song = data['query']
    track_info = fetch_track_info(song)

    if track_info is None:
        return jsonify({'error': 'No track found ＞﹏＜'}), 404
    
    return jsonify(track_info)

@app.route('/get-lyrics', methods=['POST'])
def get_lyrics():
    data = request.get_json()
    
    track_id = data['track_id']
    lyrics = fetch_lyrics(track_id)

    if lyrics is None:
        return jsonify({'error': 'No lyrics found ＞﹏＜'}), 404
    
    return jsonify({'lyrics': lyrics})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)