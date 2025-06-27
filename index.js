const prevLyrics = document.getElementById('prev-lyrics')
const currLyrics = document.getElementById('curr-lyrics')
const nextLyrics = document.getElementById('next-lyrics')

const HOST = '127.0.0.1:24050'
const ws = new ReconnectingWebSocket(`ws://${HOST}/ws`)

ws.onopen = () => {
    console.log('ws connected')
}

ws.onclose = event => {
    console.log('ws closed: ', event)
    ws.send(closed)
}

ws.onerror = error => {
    console.log('ws error: ', error)
}

let trackInfo
let trackId
let trackLength
let bmId
let lyrics
let currLine = 0

async function fetchTrackInfo(query) {
    try {
        const response = await fetch('http://127.0.0.1:5000/get-track-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        })

        const data = await response.json()

        if (!response.ok) {
            currLyrics.innerText = data.error
            return
        }

        return data
    
    } catch (error) {
        return
    }
}

async function findTrackInfo(query, backup) {
    let info = await fetchTrackInfo(query)
    if (info) {
        return info
    }

    console.log('weeb song detected.')
    return await fetchTrackInfo(backup)
}

async function fetchLyrics(trackId) {
    try {
        const response = await fetch('http://127.0.0.1:5000/get-lyrics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ track_id: trackId })
        })

        const data = await response.json()

        if (!response.ok) {
            currLyrics.innerText = data.error
            return
        }

        lyrics = JSON.parse(data.lyrics)

        convertAllLyricsToRomaji();
    
    } catch (error) {
        return
    }
    
}

ws.onmessage = async event => {
    try {
        const data = JSON.parse(event.data)
        let bmElapsedTime = data.menu.bm.time.current / 1000
        // debug
        /* document.getElementById('elapsed-time').innerText = `Elapsed: ${Math.round(bmElapsedTime)}s` */

        if (bmId !== data.menu.bm.set) {
            lyrics = null
            trackId = null
            currLine = 0
            bmId = data.menu.bm.set

            let songName = data.menu.bm.metadata.title
            let artistName = data.menu.bm.metadata.artist

            let searchQuery = `${songName} - ${artistName}`
            let backup = `${data.menu.bm.metadata.titleOriginal} - ${data.menu.bm.metadata.artistOriginal}`

            prevLyrics.innerText = '♫'
            currLyrics.innerText = 'Loading lyrics...'
            nextLyrics.innerText = '♫'

            trackInfo = await findTrackInfo(searchQuery, backup)
            if (trackInfo) {
                trackId = trackInfo['track_id']
                trackLength = trackInfo['track_length']
                await fetchLyrics(trackId)
            }
        }

        if (lyrics) {
            let lineStart = lyrics[currLine]['ts'] || 0
            let nextLineStart = lyrics[currLine + 1] ? lyrics[currLine + 1]['ts'] : Infinity
            let lineText = lyrics[currLine]['x'] || '♫'

            prevLyrics.innerText = currLine > 0 ? lyrics[currLine - 1]['x'] : '♫'
            currLyrics.innerText = lineText
            nextLyrics.innerText = currLine < lyrics.length - 1 ? lyrics[currLine + 1]['x'] : '♫'
        
            if (bmElapsedTime >= nextLineStart && currLine < lyrics.length - 1) {
                currLine++
            } else if (bmElapsedTime < lineStart && currLine > 0) {
                currLine--
            }

        }

    } catch (error) {
        console.log('ws onmessage error: ', error)
    }
}