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
