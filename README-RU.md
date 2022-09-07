# ACBR - Comic Book Reader

Программа для чтения и конвертирования комиксов в файлы форматов cbz, cbr, cb7, epub и pdf.

<p align="center">
  <img width="299" height="224" src="https://raw.githubusercontent.com/binarynonsense/comic-book-reader/master/screenshots/screenshot_01.jpg"> <img width="299" height="224" src="https://raw.githubusercontent.com/binarynonsense/comic-book-reader/master/screenshots/screenshot_02.jpg"> <img width="299" height="224" src="https://raw.githubusercontent.com/binarynonsense/comic-book-reader/master/screenshots/screenshot_03.jpg">
</p>

## Возможности:

- Версии Windows и GNU/Linux.
- Совместимость с файловыми форматами:
  - Комиксы:
    - .cbz
    - .cbr
    - .cb7
    - .pdf
    - .epub    
  - Изображения:
    - .jpg
    - .png
    - .webp
    - .avif
  - Эл. книги:
    - .pdf
    - .epub

  Включая защищенные паролем файлы pdf, cbz (шифрование AES не поддерживается), cb7 и cbr.
- Оконный (простой пользовательский интерфейс) и полноэкранный (без пользовательского интерфейса) режимы.
- "Подгонка по ширине", "подгонка по высоте" и настраиваемые виды страниц "масштабирование по высоте".
- Поворот страницы.
- Интерфейс доступен на:
  - Английском
  - Испанском
  - Русском
- Автоматически восстанавливает последнюю открытую книгу и страницу предыдущего сеанса, а также запоминает расположение страниц последних книг.
- Переносной режим (путем создания файла с именем portable.txt в той же папке, что и исполняемый файл).
- Встроенный аудиоплеер:
    - поддерживает файлы формата .mp3, .ogg, .wav, .m3u and .m3u8
    - можно экспортировать плейлисты в файлы .m3u
- Инстурменты:
  - Конвертирование/изменение размера:
    - комиксов (cbr, cbz, cb7, pdf или epub в cbz, cb7, pdf или epub).
    - изображений (jpg, png, avif или webp).
  - Создание:
    - комикс (cbz, cb7, pdf или epub) из списка файлов изображений.
    - изображение QR-кода из текста.
  - Извлечение:
    - страницы комиксов (в jpg, png, avif или webp).
    - текст (OCR) со страницы комикса или файла изображения.
    - текст QR-кода со страницы комикса или файла изображения.
    - цветовой палитры со страницы комикса или файла изображения.
      - можно экспортировать в файл палитры .gpl или .aco
  - Другое:
    - поиск и открытие книг/комиксов из:
      - Digital Comics Museum
      - Internet Archive Books
      - Project Gutenberg
      - xkcd Webcomics
    - поиск и открытие аудиокниг из:
      - Librivox AudioBooks
    - поиск словарных терминов из:
      - Викисловарь

## Управление:

- Панель инструментов :
  - кнопки: 'открыть файл', 'предыдущая страница', 'следующая страница', 'подогнать по ширине', 'подогнать по высоте', 'вращать против часовой стрелки', 'вращать по часовой стрелке' и 'переключить на весь экран'.
  - ползунок: используйте его для быстрого перехода к любой странице книги.
- Горячие клавиши:
  - 'стрелка вправо' или 'page down' - перейти на следующую страницу.
  - 'стрелка вправо' или 'page up' - перейти на предыдущую страницу.
  - 'стрелка вверх' - прокрутить страницу вверх, 'стрелка вниз' - прокрутить страницу вниз.
  - 'wasd' - прокрутка страницы по вертикали и горизонтали.
  - 'f11' - переключить на весь экран.
  - 'ctrl+O' - выбрать файл для открытия.
  - 'ctrl++' и 'ctrl+-' - увеличение или уменьшение масштаба просмотра. 'ctrl+0' - сбросить масштаб.
- Мышь:
  - 'прокрутка колеса' - прокрутка страницы вверх и вниз.
  - 'щелчёк лкм' - открывает следующую страницу, если щёлкнуть по правой стороне просмотра, и предыдущую страницу, если щёлкнуть по левой стороне.
  - 'щелчёк пкм' - открывает контекстное меню с некоторыми основными параметрами навигации.
  - 'ctrl+прокрутка колеса' - увеличить или уменьшить масштаб изображения.

## Скачать

- [Windows](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Windows.zip)
- [Windows (Self-Extracting)](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Windows_SelfExtracting.exe)
- [Linux](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Linux.zip)
- [Linux (AppImage)](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Linux_AppImage.zip)

## Лицензия

ACBR's code is released under the BSD 2-Clause [license](./LICENSE). To check the licenses of the node modules and other libraries used in the project go to the [licenses](./licenses/) folder.
