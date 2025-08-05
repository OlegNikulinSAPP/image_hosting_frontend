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

    const heroImages = [
        'images/bird.png',
        'images/cat.png',
        'images/dog1.png',
        'images/dog2.png',
        'images/dog3.png',
    ];
    let uploadedImages = [];


    function setRandomHeroImage() {
        const randomIndex = Math.floor(Math.random() * heroImages.length);
        const randomImage = heroImages[randomIndex];
        heroPage.style.backgroundImage = `url(${randomImage})`;
    }

    gotoAppButton.addEventListener(
        'click',
        () => {
            heroPage.classList.add('hidden');
            mainAppPage.classList.remove('hidden');
        }
    )

    // --- ЛОГИКА НАВИГАЦИИ ---
    // 1. Перебираем все элементы навигационных кнопок (NodeList или массив)
    navButtons.forEach(button => {

        // 2. Добавляем обработчик события 'click' для каждой кнопки
        button.addEventListener('click', () => {

            // 3. Получаем значение атрибута data-view текущей кнопки
            // Например, если в HTML: <button data-view="upload">,
            // то view = "upload"
            const view = button.dataset.view;

            // 4. Сначала снимаем класс 'active' со ВСЕХ кнопок навигации
            // Это нужно для сброса предыдущего активного состояния
            navButtons.forEach(btn => btn.classList.remove('active'));

            // 5. Затем добавляем класс 'active' ТОЛЬКО текущей нажатой кнопке
            // Это визуально выделяет активную вкладку
            button.classList.add('active');

            // 6. Проверяем, какая вкладка должна быть показана
            if (view === 'upload') {
                // 7. Если это вкладка загрузки (upload):
                // - Показываем блок загрузки (удаляя класс hidden)
                uploadView.classList.remove('hidden');
                // - Скрываем блок галереи (добавляя класс hidden)
                imagesView.classList.add('hidden');
            } else {
                // 8. Если это НЕ вкладка загрузки (значит галерея):
                // - Скрываем блок загрузки
                uploadView.classList.add('hidden');
                // - Показываем блок галереи
                imagesView.classList.remove('hidden');
                // 9. Дополнительно вызываем функцию renderImages(),
                // которая обновляет содержимое галереи
                renderImages();
            }
        })
    })

    // --- ЛОГИКА UPLOAD ---
    function handleFileUpload(file) {
        urlInput.value = '';
        uploadError.classList.add('hidden');
        setTimeout(() => {
            if (Math.random() < 0.8) {
                const fakeUrl = `https://sharefile.xyz/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
                urlInput.value = fakeUrl;
                uploadedImages.push({id: Date.now(), name: file.name, url: fakeUrl});
            } else {
                uploadError.classList.remove('hidden');
            }
        }, 2000);
    }

    browseBtn.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) handleFileUpload(fileInput.files[0]);
    });
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
    });
    copyBtn.addEventListener('click', () => {
        if (urlInput.value) {
            navigator.clipboard.writeText(urlInput.value).then(() => {
                copyBtn.textContent = 'COPIED!';
                setTimeout(() => {
                    copyBtn.textContent = 'COPY';
                }, 2000);
            });
        }
    });

    // Функция для отображения списка загруженных изображений
    function renderImages() {
        // 1. Очищаем контейнер перед рендерингом
        imageList.innerHTML = '';

        // 2. Проверяем, есть ли загруженные изображения
        if (uploadedImages.length === 0) {
            // 3. Если массив пуст, показываем сообщение
            imageList.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 20px;">No images uploaded yet.</p>';
            return; // Прерываем выполнение функции
        }

        // 4. Перебираем все изображения в массиве uploadedImages
        uploadedImages.forEach(image => {
            // 5. Клонируем шаблон для нового элемента изображения
            const templateClone = imageItemTemplate.content.cloneNode(true);

            // 6. Устанавливаем уникальный ID для элемента (из данных изображения)
            templateClone.querySelector('.image-item').dataset.id = image.id;

            // 7. Заполняем название изображения
            templateClone.querySelector('.image-item__name span').textContent = image.name;

            // 8. Находим ссылку и заполняем её данные
            const urlLink = templateClone.querySelector('.image-item__url a');
            urlLink.href = image.url;    // URL для перехода
            urlLink.textContent = image.url; // Отображаемый текст

            // 9. Добавляем готовый элемент в DOM
            imageList.appendChild(templateClone);
        });
    }

    // 10. Добавляем обработчик кликов для списка изображений (делегирование событий)
    imageList.addEventListener('click', (e) => {
        // 11. Проверяем, был ли клик по кнопке удаления
        const deleteButton = e.target.closest('.delete-btn');

        if (deleteButton) {
            // 12. Находим родительский элемент изображения
            const listItem = e.target.closest('.image-item');

            // 13. Получаем ID изображения из data-атрибута
            const imageId = parseInt(listItem.dataset.id, 10);

            // 14. Удаляем изображение из массива (фильтруем массив)
            uploadedImages = uploadedImages.filter(img => img.id !== imageId);

            // 15. Перерисовываем список
            renderImages();
        }
    });
    setRandomHeroImage();
})
