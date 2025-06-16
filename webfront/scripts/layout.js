document.addEventListener("DOMContentLoaded", function() {
    const loadComponent = (selector, url) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not load ${url}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                const element = document.querySelector(selector);
                if (element) {
                    element.innerHTML = data;
                }
            })
            .catch(error => console.error("Error loading component:", error));
    };

    // Load the header and footer from your new file paths
    loadComponent('.header-placeholder', '/webfront/pages/_includes/_header.html');
    loadComponent('.footer-placeholder', '/webfront/pages/_includes/_footer.html');
});