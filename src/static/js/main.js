// JavaScript principal para o site
document.addEventListener('DOMContentLoaded', function() {
    // Animações de entrada para elementos da página inicial
    const animateElements = document.querySelectorAll('.feature-card, .hero-section h1, .hero-section .lead, .hero-section .btn');
    
    animateElements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('fade-in');
        }, 100 * index);
    });
    
    // Smooth scroll para links de âncora
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            if (!targetId) return;
            
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
});
