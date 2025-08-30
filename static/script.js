// script.js - обновленная версия
document.addEventListener('DOMContentLoaded', () => {
    const heroPage = document.getElementById('hero-page');
    const mainAppPage = document.getElementById('main-app-page');
    const gotoAppButton = document.getElementById('goto-app-button');
    const navButtons = document.querySelectorAll('.app-nav__button');
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

    const API_BASE_URL = window.location.origin;
    let uploadedImages = [];

    function setRandomHeroImage() {
        const images = [
            'static/bird.png',
            'static/cat.png',
            'static/dog1.png',
            'static/dog2.png',
            'static/dog3.png'
        ];
        const randomIndex = Math.floor(Math.random() * images.length);
        const randomImage = images[randomIndex];
        heroPage.style.backgroundImage = `url(${randomImage})`;
    }

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

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
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

    // Работа с localStorage
    function loadImagesFromLocalStorage() {
        const storedImages = localStorage.getItem('uploadedImages');
        if (storedImages) {
            try {
                uploadedImages = JSON.parse(storedImages);
            } catch (e) {
                console.error("Ошибка при парсинге 'uploadedImages':", e);
                uploadedImages = [];
            }
        }
    }

    function saveImagesToLocalStorage() {
        localStorage.setItem('uploadedImages', JSON.stringify(uploadedImages));
    }

    // Загрузка списка изображений
    function loadImagesList() {
        imageList.innerHTML = '';

        if (uploadedImages.length === 0) {
            imageList.innerHTML = `
                <div style="text-align:center; color: var(--text-muted); padding: 40px;">
                    <i class="fas fa-image" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>No images uploaded yet.</p>
                    <p style="font-size: 14px; margin-top: 8px;">Upload your first image to get started!</p>
                </div>
            `;
            return;
        }

        uploadedImages.forEach(image => {
            const templateClone = imageItemTemplate.content.cloneNode(true);
            const listItem = templateClone.querySelector('.image-item');

            listItem.dataset.id = image.id;
            listItem.querySelector('.image-item__name span').textContent = image.name;

            const urlLink = listItem.querySelector('.image-item__url a');
            urlLink.href = image.fullUrl;
            urlLink.textContent = image.fullUrl;
            urlLink.target = '_blank';
            urlLink.rel = 'noopener noreferrer';

            // Добавляем информацию о размере
            const sizeInfo = document.createElement('small');
            sizeInfo.textContent = ` (${formatFileSize(image.size)})`;
            sizeInfo.style.color = 'var(--text-muted)';
            sizeInfo.style.marginLeft = '8px';
            listItem.querySelector('.image-item__name').appendChild(sizeInfo);

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
