document.addEventListener('DOMContentLoaded', () => {
    const heroPage = document.getElementById('hero-page');


    const heroImages = [
        'images/bird.png',
        'images/cat.png',
        'images/dog1.png',
        'images/dog2.png',
        'images/dog3.png',
    ];


    function setRandomHeroImage() {
        const randomIndex = Math.floor(Math.random() * heroImages.length);
        const randomImage = heroImages[randomIndex];
        heroPage.style.backgroundImage = `url(${randomImage})`;
    }


    setRandomHeroImage();
    setInterval(setRandomHeroImage, 1000);
});