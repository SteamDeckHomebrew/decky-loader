FROM archlinux:base-devel-20210110.0.13332

RUN pacman -Syy --noconfirm
RUN pacman -S python3 --noconfirm

WORKDIR /build

RUN python -m ensurepip
RUN python -m pip install --upgrade pip
RUN python -m pip install pyinstaller
RUN if [ -f requirements.txt ]; then pip install -r requirements.txt; fi