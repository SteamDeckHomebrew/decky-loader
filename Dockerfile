FROM ubuntu:focal

RUN apt -y update 
RUN apt -y install python3

WORKDIR /build

RUN python3 -m ensurepip
RUN python3 -m pip install --upgrade pip
RUN python3 -m pip install pyinstaller
