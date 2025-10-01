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
    let currentPage = 1;
    let totalPages = 1;

    // Функция установки фонового изображения
    function setRandomHeroImage() {
        const images = [
            '/static/images/bird.png',
            '/static/images/cat.png',
            '/static/images/dog1.png',
            '/static/images/dog2.png',
            '/static/images/dog3.png'
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

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            return response.json();
        })
        .then(data => {
            console.log(data)
            if (data.status === 'success') {
                const fullUrl = `${API_BASE_URL}${data.url}`;
                urlInput.value = fullUrl;

                // Показываем уведомление
                showNotification('Файл успешно загружен!', 'success');

                // Обновляем список изображений если мы на соответствующей вкладке
                if (!imagesView.classList.contains('hidden')) {
                    loadImagesList();
                }
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

   // Загрузка списка изображений с сервера
function loadImagesList(page = 1) {
    fetch(`/images-list?page=${page}`)
        .then(response => response.json())
        .then(data => {
            displayImagesList(data.images, data.pagination);
        })
        .catch(error => {
            console.error('Ошибка загрузки списка изображений:', error);
            showNotification('Ошибка загрузки списка изображений', 'error');
        });
}

function displayImagesList(images, pagination) {
    imageList.innerHTML = '';
    currentPage = pagination.page;
    totalPages = pagination.pages;

    if (images.length === 0) {
        imageList.innerHTML = `
            <div style="text-align:center; color: var(--text-muted); padding: 40px;">
                <i class="fas fa-image" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No images uploaded yet.</p>
                <p style="font-size: 14px; margin-top: 8px;">Upload your first image to get started!</p>
            </div>
        `;
        return;
    }

    images.forEach(image => {
        const templateClone = imageItemTemplate.content.cloneNode(true);
        const listItem = templateClone.querySelector('.image-item');
        listItem.dataset.id = image.id;
        listItem.querySelector('.image-item__name span').textContent = image.original_name;

        const urlLink = listItem.querySelector('.image-item__url a');
        urlLink.href = `${API_BASE_URL}/images/${image.filename}`;
        urlLink.textContent = `${API_BASE_URL}/images/${image.filename}`;
        urlLink.target = '_blank';
        urlLink.rel = 'noopener noreferrer';

        // Добавляем информацию о размере файла
        const sizeInfo = document.createElement('small');
        sizeInfo.textContent = ` (${formatFileSize(image.size)})`;
        sizeInfo.style.color = 'var(--text-muted)';
        sizeInfo.style.marginLeft = '8px';
        listItem.querySelector('.image-item__name').appendChild(sizeInfo);

        // Добавляем информацию о дате загрузки
        const dateInfo = document.createElement('div');
        dateInfo.className = 'image-item__date';
        dateInfo.textContent = new Date(image.upload_time).toLocaleString();
        dateInfo.style.fontSize = '12px';
        dateInfo.style.color = 'var(--text-muted)';
        dateInfo.style.marginTop = '4px';
        listItem.querySelector('.image-item__name').appendChild(dateInfo);

        // Добавляем обработчик удаления
        const deleteBtn = listItem.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteImage(image.id));

        imageList.appendChild(templateClone);
    });

    // Добавляем пагинацию
    addPagination();
}

function addPagination() {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination';
    paginationContainer.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        gap: 10px;
    `;

    // Кнопка "Назад"
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => loadImagesList(currentPage - 1));

    // Информация о странице
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    pageInfo.style.cssText = `
        padding: 8px 16px;
        color: var(--text-muted);
    `;

    // Кнопка "Вперед"
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => loadImagesList(currentPage + 1));

    // Стили для кнопок пагинации
    const buttonStyle = `
        padding: 8px 16px;
        border: 1px solid var(--border-color);
        background: white;
        color: var(--primary-blue);
        cursor: pointer;
        border-radius: 4px;
    `;

    const disabledStyle = `
        opacity: 0.5;
        cursor: not-allowed;
    `;

    prevButton.style.cssText = buttonStyle;
    nextButton.style.cssText = buttonStyle;

    if (prevButton.disabled) prevButton.style.cssText += disabledStyle;
    if (nextButton.disabled) nextButton.style.cssText += disabledStyle;

    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextButton);
    imageList.appendChild(paginationContainer);
}

function deleteImage(imageId) {
    if (confirm('Are you sure you want to delete this image?')) {
        fetch(`/delete/${imageId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                showNotification('Image deleted successfully', 'success');
                loadImagesList(currentPage);
            } else {
                showNotification(data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Ошибка удаления:', error);
            showNotification('Error deleting image', 'error');
        });
    }
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

    // Инициализация
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
