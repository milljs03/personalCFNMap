document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const address = params.get('address') || 'Your Address'; // Default address

    // Bind click handlers to sign-up buttons
    document.querySelectorAll('.sign-up-btn').forEach(button => {
        const plan = button.closest('.pricing-box').dataset.plan;
        button.addEventListener('click', () => handleSignUp(plan, address));
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const address = params.get('address') || 'Your Address'; // Default address

    // Bind click handlers to sign-up buttons
    document.querySelectorAll('.sign-up-btn').forEach(button => {
        const plan = button.closest('.pricing-box').dataset.plan;
        button.addEventListener('click', () => handleSignUp(plan, address));
    });
});

function handleSignUp(plan, address) {
    if (!address) {
        alert('Address is required for sign-up.');
        return;
    }
    const url = `signup.html?plan=${encodeURIComponent(plan)}&address=${encodeURIComponent(address)}`;
    window.location.href = url;
}


document.addEventListener("DOMContentLoaded", function() {
    // Fetch and inject the header
    fetch('/webfront/pages/_includes/header.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('header-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading the header:', error));

    // Fetch and inject the footer
    fetch('/_includes/footer.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('footer-placeholder').innerHTML = data;
        })
        .catch(error => console.error('Error loading the footer:', error));
});
