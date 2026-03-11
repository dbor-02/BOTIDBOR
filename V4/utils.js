export function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-4 right-4 z-50 transform transition-all duration-300 translate-y-2 opacity-0';
        document.body.appendChild(toast);
    }

    const colors = {
        success: 'bg-primary',
        error: 'bg-red-500',
        warning: 'bg-orange-500',
        info: 'bg-surfaceHover'
    };

    const icons = {
        success: 'check-circle',
        error: 'alert-circle',
        warning: 'alert-triangle',
        info: 'info'
    };

    toast.innerHTML = `
        <div class="${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 border border-border">
            <i data-lucide="${icons[type]}" class="w-4 h-4"></i>
            <span>${message}</span>
        </div>
    `;

    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    if (window.lucide) {
        window.lucide.createIcons();
    }

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        toast.classList.remove('opacity-100', 'translate-y-0');
    }, 3000);
}

window.showToast = showToast;