#!/bin/bash

# -------------------------------------------------------------------------------------
# Description
# -------------------------------------------------------------------------------------
#
# Retrieves audio from video stream using ffmpeg tool and sends it to a Node.js script
# that connects to Amazon Transcribe service to convert audio into text. Transcriptions
# are then sent via WebSocket to the IVS player. In addition, the Node.js script when 
# started connects to a DynamoDB table to retrieve overlays configuration. This config
# is sent along with the transcriptions using Amazon IVS Timed Metadata to show images
# on top of the player that are related to what is being said.
#
# -------------------------------------------------------------------------------------
# ffmpeg command usage
# -------------------------------------------------------------------------------------
# INPUT options:
# -i $RTMP_INPUT: read from stream URL specified in env var $RTMP_INPUT
#
# OUTPUT options:
# -tune zerolatency: specify low latency streaming
# -muxdelay 0: set maximum demux-decode delay to 0 seconds
# -af "afftdn=nf=-20, highpass=f=200, lowpass=f=3000": specify audio filters
# -vn: skip inclusion of video stream
# -sn: skip inclusion of subtitles stream
# -dn: skip inclusion of data stream
# -f wav: force output to wav format
# -ar 16000: set audio sampling frequency to 16000
# -ac 1: set number of audio channels to 1

while :
do
  echo "Loop start"

  feed_time=$(ffprobe -v error -show_entries format=start_time -of default=noprint_wrappers=1:nokey=1 $RTMP_INPUT)
  printf "feed_time value: ${feed_time}"

  if [ ! -z "${feed_time}" ]
  then
  ffmpeg -i $RTMP_INPUT -tune zerolatency -muxdelay 0 -af "afftdn=nf=-20, highpass=f=200, lowpass=f=3000" -vn -sn -dn -f wav -ar 16000 -ac 1 - 2>/dev/null | node src/transcribe.js $feed_time

  else
  echo "FFprobe returned null as a feed time."
  
  fi

  echo "Loop finish"
  sleep 3
done