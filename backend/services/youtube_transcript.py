import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def extract_video_id(url):
    """
    Extract the video ID from a YouTube URL.
    """
    regex = r"(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^\"&?\/\s]{11})"
    match = re.search(regex, url)
    if match:
        return match.group(1)
    return None

def get_youtube_transcript(url):
    """
    Fetch the transcript of a YouTube video given its URL.
    Returns the transcript as a single string.
    """
    video_id = extract_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")

    try:
        api = YouTubeTranscriptApi()
        transcript_data = api.fetch(video_id)
        formatter = TextFormatter()
        return formatter.format_transcript(transcript_data)
    except Exception as e:
        # Fallback for videos that might have different language settings or disabled transcripts
        try:
            api = YouTubeTranscriptApi()
            transcript_list = api.list(video_id)
            transcript = transcript_list.find_transcript(['en', 'hi', 'es', 'fr'])
            return TextFormatter().format_transcript(transcript.fetch())
        except Exception as e2:
            raise ValueError(f"Could not retrieve transcript: {str(e2)}")
