import { initPOS, renderProducts } from './pos.js';
import { initInventory, renderInventory } from './inventory.js';
import { loadCartFromStorage, renderCart, clearCart, cartItems } from './cart.js';
import { products, sales, saveInventory, saveSales, formatCurrency } from './data.js';
import { showToast } from './utils.js';

window.showToast = showToast;

// ===== FUNCIONES AUXILIARES =====
function formatNumberWithDots(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Variable global para el rango de fechas
let dateRange = {
    start: new Date().toLocaleDateString(),
    end: new Date().toLocaleDateString()
};

// Variable para controlar visibilidad de filtros
let filtersVisible = true;
let showMoreInfo = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Cargado - Inicializando aplicación...');
    
    // Cargar carrito del storage
    loadCartFromStorage();
    
    // Obtener referencias a las vistas
    const views = {
        pos: document.getElementById('view-pos'),
        inv: document.getElementById('view-inventory'),
        rep: document.getElementById('view-reports')
    };

    // Función para cambiar de vista
    function switchView(target) {
        console.log('Cambiando a vista:', target);
        
        // Ocultar/mostrar vistas
        Object.keys(views).forEach(key => {
            if (views[key]) {
                views[key].classList.toggle('active', key === target);
            }
        });
        
        // Actualizar botones de navegación desktop
        const navButtons = {
            pos: document.getElementById('nav-pos'),
            inv: document.getElementById('nav-inventory'),
            rep: document.getElementById('nav-reports')
        };
        
        Object.values(navButtons).forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        if (navButtons[target]) {
            navButtons[target].classList.add('active');
        }
        
        // Actualizar botones de navegación móvil
        const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
        mobileNavBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === target) {
                btn.classList.add('active');
            }
        });
        
        // Renderizar según la vista
        if (target === 'pos') {
            renderProducts();
            renderCart();
            updateMobileCartCount();
        }
        if (target === 'inv') {
            renderInventory();
        }
        if (target === 'rep') {
            showMoreInfo = false;
            renderSalesReport();
        }
        
        // Actualizar iconos de Lucide
        if (window.lucide) {
            setTimeout(() => window.lucide.createIcons(), 50);
        }
    }

    // Logo móvil
    const mobileHomeLogo = document.getElementById('mobile-home-logo');
    if (mobileHomeLogo) {
        mobileHomeLogo.addEventListener('click', () => {
            switchView('pos');
            closeCart();
            showToast('Bienvenido al punto de venta', 'info');
        });
    }

    // Navegación móvil
    const mobileNavBtns = document.querySelectorAll('.mobile-nav-btn');
    mobileNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
            closeCart();
        });
    });

    // Redirección del logo desktop
    const homeLogo = document.getElementById('home-logo');
    if (homeLogo) {
        homeLogo.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('pos');
            renderProducts();
            renderCart();
            showToast('Bienvenido al punto de venta', 'info');
        });
    }

    // Botones de navegación desktop
    const navPos = document.getElementById('nav-pos');
    const navInv = document.getElementById('nav-inventory');
    const navRep = document.getElementById('nav-reports');
    
    if (navPos) navPos.onclick = () => switchView('pos');
    if (navInv) navInv.onclick = () => switchView('inv');
    if (navRep) navRep.onclick = () => switchView('rep');

    // Event Listener para el botón de checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.onclick = () => {
            if (cartItems.length === 0) {
                showToast('No hay productos en el carrito', 'warning');
                return;
            }
            openPaymentModal();
        };
    }

    // ========== CARRITO MÓVIL ==========
    const cartSidebar = document.getElementById('cart-sidebar');
    const mobileCartToggle = document.getElementById('mobile-cart-toggle');
    const closeCartBtn = document.getElementById('close-cart-btn');

    function updateCartVisibility() {
        if (!cartSidebar) return;
        
        if (window.innerWidth >= 1024) {
            cartSidebar.style.transform = 'none';
            cartSidebar.style.position = 'relative';
        } else {
            cartSidebar.style.transform = 'translateX(100%)';
            cartSidebar.style.position = 'fixed';
        }
    }

    window.openCart = () => {
        console.log('Abriendo carrito');
        if (cartSidebar && window.innerWidth < 1024) {
            cartSidebar.style.transform = 'translateX(0)';
            document.body.classList.add('cart-open');
        }
    };

    window.closeCart = () => {
        console.log('Cerrando carrito');
        if (cartSidebar && window.innerWidth < 1024) {
            cartSidebar.style.transform = 'translateX(100%)';
            document.body.classList.remove('cart-open');
        }
    };

    if (mobileCartToggle) {
        mobileCartToggle.addEventListener('click', openCart);
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', closeCart);
    }

    window.addEventListener('resize', updateCartVisibility);
    updateCartVisibility();
    updateMobileCartCount();

    // Inicializar modal de pago
    initPaymentModal();

    // Inicializar módulos
    console.log('Inicializando POS...');
    initPOS();
    
    console.log('Inicializando Inventario...');
    initInventory();

    // Iniciar en vista POS
    switchView('pos');
    
    console.log('Aplicación inicializada correctamente');
});

// Función para actualizar contador móvil
window.updateMobileCartCount = () => {
    const mobileCount = document.getElementById('mobile-cart-count');
    if (mobileCount) {
        mobileCount.textContent = cartItems.length;
    }
};

// Función para inicializar el modal de pago
function initPaymentModal() {
    const modal = document.getElementById('payment-modal');
    const cashContainer = document.getElementById('cash-input-container');
    const cashAmountInput = document.getElementById('cash-amount');
    const changeDisplay = document.getElementById('change-display');
    const totalSpan = document.getElementById('payment-total-amount');
    const confirmBtn = document.getElementById('payment-confirm');
    const cancelBtn = document.getElementById('payment-cancel');
    const methodBtns = document.querySelectorAll('.payment-method-btn');
    
    let selectedMethod = null;

    // Abrir modal
    window.openPaymentModal = () => {
        const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        totalSpan.textContent = formatCurrency(total);
        
        // Resetear estado
        selectedMethod = null;
        cashAmountInput.value = '';
        changeDisplay.textContent = '';
        cashContainer.classList.add('hidden');
        methodBtns.forEach(btn => {
            btn.classList.remove('bg-primary/20', 'border-primary', 'text-primary');
            btn.classList.add('border-border');
        });
        
        modal.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    };

    // Selección de método de pago
    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            methodBtns.forEach(b => {
                b.classList.remove('bg-primary/20', 'border-primary', 'text-primary');
                b.classList.add('border-border');
            });
            btn.classList.add('bg-primary/20', 'border-primary', 'text-primary');
            btn.classList.remove('border-border');
            
            selectedMethod = btn.dataset.method;
            
            if (selectedMethod === 'cash') {
                cashContainer.classList.remove('hidden');
                calculateChange();
            } else {
                cashContainer.classList.add('hidden');
            }
        });
    });

    // Calcular vuelto
    const calculateChange = () => {
        const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const cashValue = cashAmountInput.value.replace(/\./g, '');
        const cash = parseFloat(cashValue);
        
        if (!isNaN(cash) && cash >= total) {
            const change = cash - total;
            changeDisplay.innerHTML = `Vuelto: <span class="text-primary font-bold">${formatCurrency(change)}</span>`;
            return true;
        } else if (!isNaN(cash) && cash < total) {
            changeDisplay.innerHTML = `<span class="text-red-400">Monto insuficiente</span>`;
            return false;
        } else {
            changeDisplay.innerHTML = '';
            return false;
        }
    };

    // Formatear input mientras escribe
    cashAmountInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\./g, '');
        if (value) {
            value = parseInt(value, 10);
            if (!isNaN(value)) {
                e.target.value = formatNumberWithDots(value);
            }
        }
        calculateChange();
    });

    // Confirmar venta
    confirmBtn.onclick = () => {
        if (!selectedMethod) {
            showToast('Debes seleccionar un método de pago', 'warning');
            return;
        }

        if (selectedMethod === 'cash') {
            const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const cashValue = cashAmountInput.value.replace(/\./g, '');
            const cash = parseFloat(cashValue);
            
            if (isNaN(cash) || cash < total) {
                showToast('Monto inválido o insuficiente', 'error');
                return;
            }
        }

        // Procesar la venta
        const saleTotal = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        
        const sale = {
            id: 'V' + Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            items: [...cartItems],
            total: saleTotal,
            paymentMethod: selectedMethod,
            timestamp: Date.now()
        };
        sales.push(sale);

        cartItems.forEach(item => {
            const p = products.find(prod => prod.id === item.id);
            if (p) p.stock -= item.quantity;
        });

        saveInventory();
        saveSales();
        clearCart();
        renderProducts();
        renderInventory();
        updateMobileCartCount();
        
        modal.classList.add('hidden');
        showToast('Venta registrada', 'success');
        
        if (window.lucide) window.lucide.createIcons();
    };

    // Cancelar
    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        showToast('Venta cancelada', 'info');
    };

    // Cerrar si se hace clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

// ===== FUNCIÓN PARA ELIMINAR VENTAS =====
window.deleteSale = (saleId) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-2xl w-full max-w-md p-6 border border-border shadow-2xl">
            <h3 class="text-lg font-bold mb-2">Confirmar eliminación</h3>
            <p class="text-textMuted text-sm">¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.</p>
            <div class="flex justify-end gap-3 mt-6">
                <button class="cancel-delete px-4 py-2 text-sm font-medium text-textMuted hover:bg-surfaceHover rounded-xl transition-colors">Cancelar</button>
                <button class="confirm-delete px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all">Eliminar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.cancel-delete').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.confirm-delete').addEventListener('click', () => {
        const index = sales.findIndex(s => s.id === saleId);
        if (index !== -1) {
            sales.splice(index, 1);
            saveSales();
            renderSalesReport();
            showToast('Venta eliminada', 'info');
        }
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

// ========== FUNCIONES DE REPORTES ==========

// Función para mostrar/ocultar filtros
window.toggleDateFilters = function() {
    const filtersDiv = document.getElementById('date-filters');
    const toggleBtn = document.getElementById('toggle-filters-btn');
    const toggleIcon = document.getElementById('toggle-filters-icon');
    
    if (filtersDiv) {
        filtersVisible = !filtersVisible;
        
        if (filtersVisible) {
            filtersDiv.classList.remove('hidden');
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i data-lucide="calendar" class="w-4 h-4"></i> Ocultar filtros';
            }
            if (toggleIcon) {
                toggleIcon.classList.add('rotate-180');
            }
        } else {
            filtersDiv.classList.add('hidden');
            if (toggleBtn) {
                toggleBtn.innerHTML = '<i data-lucide="calendar" class="w-4 h-4"></i> Mostrar filtros';
            }
            if (toggleIcon) {
                toggleIcon.classList.remove('rotate-180');
            }
        }
        if (window.lucide) window.lucide.createIcons();
    }
};

// Función para mostrar más información
window.toggleMoreInfo = function() {
    showMoreInfo = !showMoreInfo;
    renderSalesReport();
    
    // Scroll suave hacia el botón
    setTimeout(() => {
        const btn = document.getElementById('toggle-more-info-btn');
        if (btn) {
            btn.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 200);
};

// Función para aplicar filtro de fechas
window.applyDateFilter = function() {
    const start = document.getElementById('date-start').value;
    const end = document.getElementById('date-end').value;
    
    if (start && end) {
        const startDate = new Date(start).toLocaleDateString();
        const endDate = new Date(end).toLocaleDateString();
        
        dateRange = { start: startDate, end: endDate };
        
        renderSalesReport();
        showToast('Filtro aplicado', 'success');
    }
};

// Función para resetear a hoy
window.resetToToday = function() {
    const today = new Date().toISOString().split('T')[0];
    const startInput = document.getElementById('date-start');
    const endInput = document.getElementById('date-end');
    
    if (startInput && endInput) {
        startInput.value = today;
        endInput.value = today;
    }
    
    dateRange = {
        start: new Date().toLocaleDateString(),
        end: new Date().toLocaleDateString()
    };
    
    renderSalesReport();
    showToast('Mostrando ventas de hoy', 'info');
};

// Función para últimos días
window.setLastDays = function(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const startInput = document.getElementById('date-start');
    const endInput = document.getElementById('date-end');
    
    if (startInput && endInput) {
        startInput.value = start.toISOString().split('T')[0];
        endInput.value = end.toISOString().split('T')[0];
    }
    
    dateRange = {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString()
    };
    
    renderSalesReport();
    showToast(`Últimos ${days} días`, 'info');
};

function renderSalesReport() {
    const container = document.getElementById('reports-container');
    if (!container) return;
    
    // Filtrar ventas por rango de fechas
    const filteredSales = sales.filter(sale => {
        const saleDate = sale.date;
        return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });
    
    // Ordenar ventas por fecha (más reciente primero)
    const sortedSales = [...filteredSales].sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.date.split('/').reverse().join('-'));
        if (dateA > dateB) return -1;
        if (dateA < dateB) return 1;
        return b.time.localeCompare(a.time);
    });
    
    // Estadísticas del período
    const totalPeriod = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalSales = filteredSales.length;

    // Función para obtener icono de método de pago
    function getPaymentIcon(method) {
        const icons = {
            cash: 'banknote',
            card: 'credit-card',
            transfer: 'smartphone'
        };
        return icons[method] || 'credit-card';
    }

    // Función para obtener color de método de pago
    function getPaymentColor(method) {
        const colors = {
            cash: 'text-green-400',
            card: 'text-blue-400',
            transfer: 'text-purple-400'
        };
        return colors[method] || 'text-textMuted';
    }

    // Filtros HTML
    const filtersHTML = `
        <div id="date-filters" class="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-6 ${filtersVisible ? '' : 'hidden'}">
            <h2 class="text-base md:text-lg font-semibold mb-4 flex items-center gap-2">
                <i data-lucide="calendar" class="w-4 h-4 md:w-5 md:h-5 text-primary"></i>
                Filtrar por Fechas
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div class="w-full">
                    <label class="block text-sm text-textMuted mb-1">Desde</label>
                    <input type="date" id="date-start" value="${new Date().toISOString().split('T')[0]}" 
                           class="w-full bg-surfaceHover border border-border rounded-lg px-3 py-3 text-textMain text-sm">
                </div>
                <div class="w-full">
                    <label class="block text-sm text-textMuted mb-1">Hasta</label>
                    <input type="date" id="date-end" value="${new Date().toISOString().split('T')[0]}" 
                           class="w-full bg-surfaceHover border border-border rounded-lg px-3 py-3 text-textMain text-sm">
                </div>
                <div class="w-full">
                    <button onclick="window.applyDateFilter()" class="w-full bg-primary hover:bg-primaryHover text-white px-3 py-3 rounded-lg text-sm whitespace-nowrap">
                        Aplicar
                    </button>
                </div>
                <div class="w-full">
                    <button onclick="window.resetToToday()" class="w-full bg-surfaceHover hover:bg-surfaceHover/80 text-textMain px-3 py-3 rounded-lg text-sm whitespace-nowrap">
                        Hoy
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                <button onclick="window.setLastDays(7)" class="bg-surfaceHover hover:bg-primary/20 px-3 py-2 rounded-full text-sm">7 días</button>
                <button onclick="window.setLastDays(15)" class="bg-surfaceHover hover:bg-primary/20 px-3 py-2 rounded-full text-sm">15 días</button>
                <button onclick="window.setLastDays(30)" class="bg-surfaceHover hover:bg-primary/20 px-3 py-2 rounded-full text-sm">30 días</button>
                <button onclick="window.setLastDays(90)" class="bg-surfaceHover hover:bg-primary/20 px-3 py-2 rounded-full text-sm">90 días</button>
            </div>
        </div>
    `;

    // Construir el HTML base
    let html = `
        <div class="space-y-4 md:space-y-6">
            <!-- Botón para mostrar/ocultar filtros -->
            <div class="flex justify-end">
                <button id="toggle-filters-btn" onclick="window.toggleDateFilters()" class="flex items-center gap-2 bg-surface border border-border px-3 md:px-4 py-3 rounded-lg hover:bg-surfaceHover transition-colors text-sm">
                    <i data-lucide="calendar" class="w-4 h-4 text-primary"></i>
                    <span class="hidden sm:inline">${filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
                    <i id="toggle-filters-icon" data-lucide="chevron-up" class="w-4 h-4 transition-transform ${filtersVisible ? 'rotate-180' : ''}"></i>
                </button>
            </div>

            <!-- Filtros de fecha -->
            ${filtersHTML}

            <!-- Tarjetas de resumen principales -->
            <div class="grid grid-cols-2 gap-3 md:gap-4">
                <div class="bg-surface border border-border rounded-xl md:rounded-2xl p-4 md:p-6">
                    <p class="text-textMuted text-xs mb-1">Total Ventas</p>
                    <p class="text-lg md:text-2xl font-bold text-primary">${formatCurrency(totalPeriod)}</p>
                </div>
                <div class="bg-surface border border-border rounded-xl md:rounded-2xl p-4 md:p-6">
                    <p class="text-textMuted text-xs mb-1">N° de Ventas</p>
                    <p class="text-lg md:text-2xl font-bold text-primary">${totalSales}</p>
                </div>
            </div>

            <!-- Botón para mostrar más información -->
            <div class="flex justify-center">
                <button id="toggle-more-info-btn" onclick="window.toggleMoreInfo()" class="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-6 py-3 rounded-full transition-colors">
                    <i data-lucide="${showMoreInfo ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>
                    <span class="text-sm font-medium">${showMoreInfo ? 'Ocultar' : 'Ver más'} información</span>
                </button>
            </div>
    `;

    if (showMoreInfo) {
        // Estadísticas por método de pago
        const paymentMethods = {
            cash: { count: 0, total: 0, name: 'Efectivo' },
            card: { count: 0, total: 0, name: 'Tarjeta' },
            transfer: { count: 0, total: 0, name: 'Transferencia' }
        };
        
        filteredSales.forEach(sale => {
            const method = sale.paymentMethod || 'cash';
            if (paymentMethods[method]) {
                paymentMethods[method].count++;
                paymentMethods[method].total += sale.total;
            }
        });
        
        // Productos vendidos
        const productsSold = {};
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                if (!productsSold[item.name]) {
                    productsSold[item.name] = {
                        quantity: 0,
                        total: 0,
                        category: item.category
                    };
                }
                productsSold[item.name].quantity += item.quantity;
                productsSold[item.name].total += item.price * item.quantity;
            });
        });

        // Ordenar productos por cantidad vendida
        const sortedProducts = Object.entries(productsSold)
            .sort((a, b) => b[1].quantity - a[1].quantity);

        html += `
            <!-- Tarjeta de período -->
            <div class="bg-surface border border-border rounded-xl p-4 md:p-6">
                <p class="text-textMuted text-xs mb-1">Período</p>
                <p class="text-sm md:text-base font-bold">${dateRange.start} - ${dateRange.end}</p>
            </div>

            <!-- Estadísticas por método de pago - CON TRANSFERENCIA ACORTADA -->
            <div class="grid grid-cols-3 gap-2 md:gap-4">
                ${Object.entries(paymentMethods).map(([method, data]) => {
                    // Determinar tamaño de icono según dispositivo
                    const isMobile = window.innerWidth <= 768;
                    const iconSize = isMobile ? 'w-8 h-8' : 'w-5 h-5';
                    
                    // Acortar "Transferencia" a "Transf" SOLO en móvil
                    let displayName = data.name;
                    if (isMobile && data.name === 'Transferencia') {
                        displayName = 'Transf';
                    }
                    
                    return `
                    <div class="bg-surface border border-border rounded-xl p-2 md:p-4 flex flex-col items-center">
                        <div class="flex flex-col items-center gap-1 mb-2">
                            <i data-lucide="${getPaymentIcon(method)}" class="${iconSize} ${getPaymentColor(method)}"></i>
                            <span class="text-textMuted text-xs md:text-sm text-center">${displayName}</span>
                        </div>
                        <p class="text-sm md:text-base font-bold text-primary truncate text-center">${formatCurrency(data.total)}</p>
                        <p class="text-xs text-textMuted mt-1 text-center">${data.count} ventas</p>
                    </div>
                `}).join('')}
            </div>
            
            <!-- Dos columnas -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <!-- Historial de Ventas -->
                <div class="space-y-4">
                    <div class="p-4 md:p-6 bg-surface border border-border rounded-xl md:rounded-2xl">
                        <h2 class="text-base md:text-lg font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="receipt" class="w-4 h-4 md:w-5 md:h-5 text-primary"></i>
                            Historial de Ventas
                        </h2>
                        
                        <div class="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            ${sortedSales.map(sale => `
                                <div class="border border-border rounded-lg p-3 hover:bg-surfaceHover/30 transition-colors">
                                    <div class="flex justify-between items-start mb-2">
                                        <div>
                                            <span class="text-xs text-textMuted">${sale.id}</span>
                                            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                                                <span class="font-semibold text-sm">${sale.date}</span>
                                                <span class="text-xs text-textMuted">${sale.time}</span>
                                            </div>
                                        </div>
                                        <span class="text-primary font-bold text-sm">${formatCurrency(sale.total)}</span>
                                    </div>
                                    
                                    <div class="flex flex-wrap items-center gap-2 mt-2">
                                        <span class="text-xs px-2 py-1 rounded-full ${getPaymentColor(sale.paymentMethod || 'cash')} bg-opacity-10 border border-current">
                                            <i data-lucide="${getPaymentIcon(sale.paymentMethod || 'cash')}" class="w-3 h-3 inline mr-1"></i>
                                            ${paymentMethods[sale.paymentMethod || 'cash']?.name || 'Efectivo'}
                                        </span>
                                        <span class="text-xs text-textMuted">${sale.items.length} productos</span>
                                    </div>
                                    
                                    <div class="text-xs text-textMuted mt-2 line-clamp-2">
                                        ${sale.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                                    </div>
                                    
                                    <!-- BOTÓN ELIMINAR VENTA -->
                                    <div class="mt-2 flex justify-end">
                                        <button onclick="window.deleteSale('${sale.id}')" class="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                            <i data-lucide="trash-2" class="w-3 h-3"></i> Eliminar
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                            ${sortedSales.length === 0 ? '<p class="text-textMuted text-center py-8">No hay ventas en este período</p>' : ''}
                        </div>
                    </div>
                </div>
                
                <!-- Productos y Categorías -->
                <div class="space-y-4">
                    <div class="p-4 md:p-6 bg-surface border border-border rounded-xl md:rounded-2xl">
                        <h2 class="text-base md:text-lg font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="package" class="w-4 h-4 md:w-5 md:h-5 text-primary"></i>
                            Productos Más Vendidos
                        </h2>
                        
                        <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            ${sortedProducts.slice(0, 10).map(([name, data], index) => `
                                <div class="flex justify-between items-center bg-surfaceHover/50 p-2 md:p-3 rounded-lg">
                                    <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                        <span class="w-5 h-5 md:w-6 md:h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${index + 1}</span>
                                        <div class="min-w-0">
                                            <p class="font-medium text-xs md:text-sm truncate">${name}</p>
                                            <p class="text-xs text-textMuted">${data.quantity} unidades</p>
                                        </div>
                                    </div>
                                    <span class="text-primary font-semibold text-xs md:text-sm flex-shrink-0">${formatCurrency(data.total)}</span>
                                </div>
                            `).join('')}
                            ${sortedProducts.length === 0 ? '<p class="text-textMuted text-center py-8">No hay productos vendidos</p>' : ''}
                        </div>
                    </div>

                    <div class="p-4 md:p-6 bg-surface border border-border rounded-xl md:rounded-2xl">
                        <h2 class="text-base md:text-lg font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="pie-chart" class="w-4 h-4 md:w-5 md:h-5 text-primary"></i>
                            Ventas por Categoría
                        </h2>
                        
                        <div class="space-y-3">
                            ${getSalesByCategory(filteredSales).map(cat => `
                                <div>
                                    <div class="flex justify-between text-xs md:text-sm mb-1">
                                        <span class="capitalize">${cat.name}</span>
                                        <span class="text-primary">${formatCurrency(cat.total)}</span>
                                    </div>
                                    <div class="w-full bg-surfaceHover rounded-full h-1.5 md:h-2">
                                        <div class="bg-primary h-1.5 md:h-2 rounded-full" style="width: ${cat.percentage}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    html += `</div>`;
    
    container.innerHTML = html;
    
    // Asegurar que los iconos de Lucide se rendericen
    if (window.lucide) {
        setTimeout(() => window.lucide.createIcons(), 100);
    }
}

function getSalesByCategory(filteredSales) {
    const categories = {};
    let totalGeneral = 0;
    
    filteredSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!categories[item.category]) {
                categories[item.category] = 0;
            }
            categories[item.category] += item.price * item.quantity;
            totalGeneral += item.price * item.quantity;
        });
    });
    
    return Object.entries(categories)
        .map(([name, total]) => ({
            name,
            total,
            percentage: totalGeneral > 0 ? (total / totalGeneral * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.total - a.total);
}