import { initPOS, renderProducts } from './pos.js';
import { initInventory, renderInventory } from './inventory.js';
import { loadCartFromStorage, renderCart, clearCart, cartItems } from './cart.js';
import { products, sales, saveInventory, saveSales, formatCurrency } from './data.js';
import { showToast } from './utils.js';

window.showToast = showToast;

// Variable global para el rango de fechas
let dateRange = {
    start: new Date().toLocaleDateString(),
    end: new Date().toLocaleDateString()
};

document.addEventListener('DOMContentLoaded', () => {
    loadCartFromStorage();
    renderCart();
    
    const views = {
        pos: document.getElementById('view-pos'),
        inv: document.getElementById('view-inventory'),
        rep: document.getElementById('view-reports')
    };

    function switchView(target) {
        Object.keys(views).forEach(key => {
            if (views[key]) {
                views[key].classList.toggle('active', key === target);
            }
        });
        
        if (target === 'pos') {
            renderProducts();
            renderCart();
        }
        if (target === 'inv') renderInventory();
        if (target === 'rep') {
            renderSalesReport();
            initDateFilters();
        }
        
        if (window.lucide) window.lucide.createIcons();
    }

    document.getElementById('nav-pos').onclick = () => switchView('pos');
    document.getElementById('nav-inventory').onclick = () => switchView('inv');
    document.getElementById('nav-reports').onclick = () => switchView('rep');

    // Event Listener para el botón de checkout
    document.getElementById('checkout-btn').onclick = () => {
        if (cartItems.length === 0) {
            showToast('No hay productos en el carrito', 'warning');
            return;
        }
        openPaymentModal();
    };

    // Inicializar modal de pago
    initPaymentModal();

    initPOS();
    initInventory();
    switchView('pos');
});

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
        const cash = parseFloat(cashAmountInput.value);
        
        if (!isNaN(cash) && cash >= total) {
            const change = cash - total;
            changeDisplay.innerHTML = `Vuelto: <span class="text-primary font-bold">${formatCurrency(change)}</span>`;
            return true;
        } else if (!isNaN(cash) && cash < total) {
            changeDisplay.innerHTML = `<span class="text-red-400">El monto es insuficiente</span>`;
            return false;
        } else {
            changeDisplay.innerHTML = '';
            return false;
        }
    };
    
    cashAmountInput.addEventListener('input', calculateChange);

    // Confirmar venta
    confirmBtn.onclick = () => {
        if (!selectedMethod) {
            showToast('Debes seleccionar un método de pago', 'warning');
            return;
        }

        if (selectedMethod === 'cash') {
            const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
            const cash = parseFloat(cashAmountInput.value);
            
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

function initDateFilters() {
    const container = document.getElementById('reports-container');
    if (!container) return;
    
    if (!document.getElementById('date-filters')) {
        const filtersHTML = `
            <div id="date-filters" class="bg-surface border border-border rounded-2xl p-6 mb-6">
                <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
                    <i data-lucide="calendar" class="w-5 h-5 text-primary"></i>
                    Filtrar por Fechas
                </h2>
                <div class="flex flex-wrap gap-4 items-end">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm text-textMuted mb-1">Desde</label>
                        <input type="date" id="date-start" class="w-full bg-surfaceHover border border-border rounded-lg px-4 py-2 text-textMain">
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm text-textMuted mb-1">Hasta</label>
                        <input type="date" id="date-end" class="w-full bg-surfaceHover border border-border rounded-lg px-4 py-2 text-textMain">
                    </div>
                    <div class="flex gap-2">
                        <button id="apply-date-filter" class="bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-lg">
                            Aplicar
                        </button>
                        <button id="reset-date-filter" class="bg-surfaceHover hover:bg-surfaceHover/80 text-textMain px-6 py-2 rounded-lg">
                            Hoy
                        </button>
                    </div>
                </div>
                <div class="flex gap-2 mt-4">
                    <button class="quick-date bg-surfaceHover hover:bg-primary/20 px-4 py-1 rounded-full text-sm" data-days="7">Últimos 7 días</button>
                    <button class="quick-date bg-surfaceHover hover:bg-primary/20 px-4 py-1 rounded-full text-sm" data-days="15">Últimos 15 días</button>
                    <button class="quick-date bg-surfaceHover hover:bg-primary/20 px-4 py-1 rounded-full text-sm" data-days="30">Últimos 30 días</button>
                    <button class="quick-date bg-surfaceHover hover:bg-primary/20 px-4 py-1 rounded-full text-sm" data-days="90">Últimos 90 días</button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('afterbegin', filtersHTML);
        
        document.getElementById('apply-date-filter').addEventListener('click', applyDateFilter);
        document.getElementById('reset-date-filter').addEventListener('click', resetToToday);
        
        document.querySelectorAll('.quick-date').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const days = parseInt(e.target.dataset.days);
                setLastDays(days);
            });
        });
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date-start').value = today;
        document.getElementById('date-end').value = today;
    }
}

function applyDateFilter() {
    const start = document.getElementById('date-start').value;
    const end = document.getElementById('date-end').value;
    
    if (start && end) {
        const startDate = new Date(start).toLocaleDateString();
        const endDate = new Date(end).toLocaleDateString();
        
        dateRange = { start: startDate, end: endDate };
        renderSalesReport();
    }
}

function resetToToday() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date-start').value = today;
    document.getElementById('date-end').value = today;
    
    dateRange = {
        start: new Date().toLocaleDateString(),
        end: new Date().toLocaleDateString()
    };
    renderSalesReport();
}

function setLastDays(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    document.getElementById('date-start').value = start.toISOString().split('T')[0];
    document.getElementById('date-end').value = end.toISOString().split('T')[0];
    
    dateRange = {
        start: start.toLocaleDateString(),
        end: end.toLocaleDateString()
    };
    renderSalesReport();
}

function renderSalesReport() {
    const container = document.getElementById('reports-container');
    if (!container) return;
    
    initDateFilters();
    
    const filteredSales = sales.filter(sale => {
        const saleDate = sale.date;
        return saleDate >= dateRange.start && saleDate <= dateRange.end;
    });
    
    const totalPeriod = filteredSales.reduce((acc, s) => acc + s.total, 0);
    const totalSales = filteredSales.length;
    const promedioVenta = totalSales > 0 ? totalPeriod / totalSales : 0;
    
    const salesByDay = {};
    filteredSales.forEach(sale => {
        if (!salesByDay[sale.date]) {
            salesByDay[sale.date] = {
                count: 0,
                total: 0,
                sales: []
            };
        }
        salesByDay[sale.date].count++;
        salesByDay[sale.date].total += sale.total;
        salesByDay[sale.date].sales.push(sale);
    });

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

    const sortedProducts = Object.entries(productsSold)
        .sort((a, b) => b[1].quantity - a[1].quantity);

    const sortedDays = Object.entries(salesByDay)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]));

    container.innerHTML = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="bg-surface border border-border rounded-2xl p-6">
                    <p class="text-textMuted text-sm mb-2">Período</p>
                    <p class="text-xl font-bold">${dateRange.start} - ${dateRange.end}</p>
                </div>
                <div class="bg-surface border border-border rounded-2xl p-6">
                    <p class="text-textMuted text-sm mb-2">Total Ventas</p>
                    <p class="text-3xl font-bold text-primary">${formatCurrency(totalPeriod)}</p>
                </div>
                <div class="bg-surface border border-border rounded-2xl p-6">
                    <p class="text-textMuted text-sm mb-2">N° de Ventas</p>
                    <p class="text-3xl font-bold text-primary">${totalSales}</p>
                </div>
                <div class="bg-surface border border-border rounded-2xl p-6">
                    <p class="text-textMuted text-sm mb-2">Promedio por Venta</p>
                    <p class="text-3xl font-bold text-primary">${formatCurrency(promedioVenta)}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="space-y-6">
                    <div class="p-6 bg-surface border border-border rounded-2xl">
                        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="calendar-days" class="w-5 h-5 text-primary"></i>
                            Ventas por Día
                        </h2>
                        
                        <div class="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            ${sortedDays.map(([date, data]) => `
                                <div class="border border-border rounded-lg p-4">
                                    <div class="flex justify-between items-center mb-3">
                                        <span class="font-semibold">${date}</span>
                                        <span class="text-primary font-bold">${formatCurrency(data.total)}</span>
                                    </div>
                                    <div class="text-sm text-textMuted mb-2">${data.count} ventas</div>
                                    <div class="space-y-2">
                                        ${data.sales.map(sale => `
                                            <div class="bg-surfaceHover/30 p-2 rounded-lg text-sm">
                                                <div class="flex justify-between">
                                                    <span>${sale.time}</span>
                                                    <span class="text-primary">${formatCurrency(sale.total)}</span>
                                                </div>
                                                <div class="text-xs text-textMuted mt-1">
                                                    ${sale.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                            ${sortedDays.length === 0 ? '<p class="text-textMuted text-center py-8">No hay ventas en este período</p>' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="p-6 bg-surface border border-border rounded-2xl">
                        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="package" class="w-5 h-5 text-primary"></i>
                            Productos Vendidos
                        </h2>
                        
                        <div class="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                            ${sortedProducts.map(([name, data], index) => `
                                <div class="flex justify-between items-center bg-surfaceHover/50 p-4 rounded-lg">
                                    <div class="flex items-center gap-3 flex-1">
                                        <span class="w-7 h-7 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">${index + 1}</span>
                                        <div>
                                            <p class="font-medium">${name}</p>
                                            <p class="text-xs text-textMuted">${data.quantity} unidades · ${data.category}</p>
                                        </div>
                                    </div>
                                    <span class="text-primary font-semibold">${formatCurrency(data.total)}</span>
                                </div>
                            `).join('')}
                            ${sortedProducts.length === 0 ? '<p class="text-textMuted text-center py-8">No hay productos vendidos</p>' : ''}
                        </div>
                    </div>

                    <div class="p-6 bg-surface border border-border rounded-2xl">
                        <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                            <i data-lucide="pie-chart" class="w-5 h-5 text-primary"></i>
                            Ventas por Categoría
                        </h2>
                        
                        <div class="space-y-3">
                            ${getSalesByCategory(filteredSales).map(cat => `
                                <div>
                                    <div class="flex justify-between text-sm mb-1">
                                        <span class="capitalize">${cat.name}</span>
                                        <span class="text-primary">${formatCurrency(cat.total)}</span>
                                    </div>
                                    <div class="w-full bg-surfaceHover rounded-full h-2">
                                        <div class="bg-primary h-2 rounded-full" style="width: ${cat.percentage}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
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