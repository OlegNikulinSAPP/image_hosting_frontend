// script.js - обновленная версия
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем событие DOMContentLoaded
    console.log('Страница загружена!')

    const heroPage = document.getElementById('hero-page');
    const mainAppPage = document.getElementById('main-app-page');
    const gotoAppButton = document.getElementById('goto-app-button');
    const navButtons = document.querySelectorAll('.app-nav__button');

    // Мониторим работу document.querySelectorAll('.app-nav__button');
    console.log('Обнаруженные кнопки navButtons (NodeList):')
    for (const button of navButtons) {
        console.log(button)
    }

    const uploadView = document.getElementById('upload-view');
    const imagesView = document.getElementById('images-view');
    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadError = document.getElementById('upload-error');
    const urlInput = document.getElementById('url-input');
    const copyBtn = document.getElementById('copy-btn');

    const imageList = document.getElementById('image-list');
    const imageItemTemplate = document.getElementById('image-item-template');

    const API_BASE_URL = window.location.origin; // базовый URL сервера

    // Другие полезные свойства window.location
    console.log('Другие полезные свойства window.location:')
    console.log('базовый URL сервера:', window.location.origin)
    console.log('полный URL:', window.location.href )
    console.log('протокол (http:, https:):', window.location.protocol )
    console.log('хост с портом:', window.location.host)
    console.log('только имя хоста:', window.location.hostname)
    console.log('порт:', window.location.port)
    console.log('путь:', window.location.pathname)
    console.log('параметры запроса (?key=value):', window.location.search)
    console.log('якорь (#section):', window.location.hash)

    let uploadedImages = []; // массив для хранения информации о загруженных изображениях

    // Функция установки фонового изображения
    function setRandomHeroImage() {
        const images = [
            'images/bird.png',
            'images/cat.png',
            'images/dog1.png',
            'images/dog2.png',
            'images/dog3.png'
        ];
        const randomIndex = Math.floor(Math.random() * images.length);
        const randomImage = images[randomIndex];
        heroPage.style.backgroundImage = `url(${randomImage})`;
    }

    // Переход к основному приложению
    gotoAppButton.addEventListener('click', () => {
        heroPage.classList.add('hidden');
        mainAppPage.classList.remove('hidden');
    });

    // Навигация
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const view = button.dataset.view;
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (view === 'upload') {
                uploadView.classList.remove('hidden');
                imagesView.classList.add('hidden');
            } else {
                uploadView.classList.add('hidden');
                imagesView.classList.remove('hidden');
                loadImagesList();
            }
        });
    });

    // Загрузка файлов
    function handleFileUpload(file) {
        urlInput.value = '';
        uploadError.classList.add('hidden');

        const formData = new FormData();
        formData.append('file', file);

        // Логируем FormData
        console.log('FormData contents:');
        for (let [key, value] of formData.entries()) {
            console.log(`🔑 ${key}:`);
            console.log('  📝 Имя файла:', value.name);
            console.log('  📦 MIME-тип:', value.type);
            console.log('  📊 Размер:', value.size, 'байт');
            console.log('  🗂️  Тип объекта:', value instanceof File ? 'File' : typeof value);
            console.log('---');
        }

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
        // Логируем всю информацию о Response
            console.log('=== RESPONSE DETAILS ===');
            console.log('URL:', response.url);
            console.log('Status:', response.status);
            console.log('Status Text:', response.statusText);
            console.log('OK:', response.ok);
            console.log('Redirected:', response.redirected);
            console.log('Type:', response.type);

            // Логируем заголовки ответа
            console.log('Headers:');
            response.headers.forEach((value, name) => {
            console.log(`  ${name}: ${value}`);
            });

    // Возвращаем promise с JSON для дальнейшей обработки
    return response.json();
})
        .then(data => {
            // Логируем преобразованные данные из формата JSON в объект JavaScript
            console.log('=== RESPONSE JavaScript ===');
            for (let [key, value] of Object.entries(data)) {
                console.log(key, value);
            }

            if (data.status === 'success') {
                const fullUrl = `${API_BASE_URL}${data.url}`;
                urlInput.value = fullUrl;

                // Сохраняем в localStorage
                const imageInfo = {
                    id: Date.now(),
                    name: data.original_name,
                    url: data.url,
                    fullUrl: fullUrl,
                    filename: data.filename,
                    size: data.size,
                    uploadedAt: new Date().toISOString()
                };

                uploadedImages.push(imageInfo);
                saveImagesToLocalStorage();

                // Показываем уведомление
                showNotification('Файл успешно загружен!', 'success');
            } else {
                uploadError.textContent = data.message;
                uploadError.classList.remove('hidden');
                showNotification(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки:', error);
            uploadError.textContent = 'Ошибка при загрузке файла';
            uploadError.classList.remove('hidden');
            showNotification('Ошибка при загрузке файла', 'error');
        });
    }

    // Уведомления
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 5px;
            color: white;
            z-index: 1000;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        if (type === 'success') {
            notification.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#dc3545';
        } else {
            notification.style.backgroundColor = '#17a2b8';
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Работа с localStorage (читаем из localStorage)
    function loadImagesFromLocalStorage() {
        storedImages = localStorage.getItem('uploadedImages')

        if (storedImages) {
            try {
                uploadedImages = JSON.parse(storedImages);
                console.log('Загружено изображений:', uploadedImages.length);
            } catch (e) {
                console.log('Ошибка при парсинге "uploadedImages"', e);
                uploadedImages = [];
            }
        }
    }

    function saveImagesToLocalStorage() {
        localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
    }

   // Загрузка списка изображений
function loadImagesList() {
    // Очищаем контейнер списка изображений перед загрузкой новых данных
    // Это предотвращает дублирование элементов при повторном вызове функции
    imageList.innerHTML = '';

    // Проверяем, есть ли загруженные изображения для отображения
    if (uploadedImages.length === 0) {
        // Если изображений нет, показываем сообщение о пустом состоянии
        imageList.innerHTML = `
            <div style="text-align:center; color: var(--text-muted); padding: 40px;">
                <i class="fas fa-image" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No images uploaded yet.</p>
                <p style="font-size: 14px; margin-top: 8px;">Upload your first image to get started!</p>
            </div>
        `;
        // Прерываем выполнение функции, так как дальше нечего обрабатывать
        return;
    }

    // Если изображения есть, перебираем массив uploadedImages
    // Для каждого изображения создаем элемент списка на основе шаблона
    uploadedImages.forEach(image => {
        // Клонируем содержимое HTML-шаблона для элемента изображения
        // cloneNode(true) создает полную копию всех вложенных элементов
        const templateClone = imageItemTemplate.content.cloneNode(true);

        // Находим основной элемент списка в клоне шаблона
        const listItem = templateClone.querySelector('.image-item');

        // Устанавливаем уникальный идентификатор элемента через data-атрибут
        listItem.dataset.id = image.id;
        console.log('Текущему элементу списка установлен номер:', image.id)

        // Заполняем элемент данными об изображении:
        // Устанавливаем имя файла в соответствующий элемент
        listItem.querySelector('.image-item__name span').textContent = image.name;
        console.log('Элементу номер', image.id, 'установлено имя:', image.name);

        // Находим ссылку на изображение и заполняем её данными
        const urlLink = listItem.querySelector('.image-item__url a');
        urlLink.href = image.fullUrl; // URL для перехода при клике
        urlLink.textContent = image.fullUrl; // Текст ссылки
        urlLink.target = '_blank'; // Открывать ссылку в новой вкладке
        urlLink.rel = 'noopener noreferrer'; // Защита от уязвимостей безопасности

        // Создаем элемент для отображения размера файла
        const sizeInfo = document.createElement('small');
        sizeInfo.textContent = ` (${formatFileSize(image.size)})`; // Форматируем размер
        sizeInfo.style.color = 'var(--text-muted)'; // Используем CSS-переменную для цвета
        sizeInfo.style.marginLeft = '8px'; // Добавляем отступ слева

        // Добавляем информацию о размере к элементу с именем файла
        listItem.querySelector('.image-item__name').appendChild(sizeInfo);

        // Добавляем готовый элемент в контейнер списка изображений
        imageList.appendChild(templateClone);
    });
}

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Обработчики событий
    browseBtn.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('click', (e) => {
        if (e.target === dropZone || e.target.classList.contains('upload-icon')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            handleFileUpload(file);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            handleFileUpload(file);
        }
    });

    copyBtn.addEventListener('click', () => {
        if (urlInput.value) {
            navigator.clipboard.writeText(urlInput.value).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'COPIED!';
                copyBtn.style.backgroundColor = '#28a745';

                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '';
                }, 2000);
            }).catch(err => {
                console.error('Ошибка копирования:', err);
            });
        }
    });

    imageList.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const listItem = e.target.closest('.image-item');
            const imageId = parseInt(listItem.dataset.id, 10);

            if (confirm('Are you sure you want to delete this image?')) {
                uploadedImages = uploadedImages.filter(img => img.id !== imageId);
                saveImagesToLocalStorage();
                loadImagesList();
                showNotification('Image deleted', 'success');
            }
        }
    });

    // Инициализация
    loadImagesFromLocalStorage();
    setRandomHeroImage();

    // Проверка соединения с сервером
    fetch('/')
        .then(response => {
            if (!response.ok) {
                console.warn('Сервер недоступен');
            }
        })
        .catch(error => {
            console.error('Ошибка соединения:', error);
        });
});
