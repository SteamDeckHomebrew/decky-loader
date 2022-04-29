FROM ubuntu:focal

RUN apt -y update 
RUN apt -y install python3 python3-pip

WORKDIR /build

RUN pip3 install --upgrade pip
RUN pip3 install pyinstaller
