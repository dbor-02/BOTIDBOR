import { products, formatCurrency, saveInventory } from './data.js';
import { showToast } from './utils.js';

// VARIABLES DE ESTADO PARA FILTRO Y ORDEN
let inventorySearchQuery = '';
let inventorySortOrder = 'asc';
let selectedProductId = null;

// ===== CONFIGURACIÓN DE UNSPLASH =====
const UNSPLASH_ACCESS_KEY = 'q1MRKcQ4ZXRj8LgIXmqRv7zAUlKQe59UG0E5DriIt-8';

// Función para buscar imagen en Unsplash
async function searchUnsplashImage(productName) {
    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(productName)}&client_id=${UNSPLASH_ACCESS_KEY}&per_page=1&orientation=landscape`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Retorna la imagen en tamaño regular
            return data.results[0].urls.regular;
        }
    } catch (error) {
        console.error('Error buscando imagen en Unsplash:', error);
    }
    return null;
}

// Función para manejar la selección de producto
window.selectProduct = (productId, button) => {
    // Remover selección anterior
    if (selectedProductId) {
        const prevSelected = document.querySelector(`[data-product-id="${selectedProductId}"]`);
        if (prevSelected) {
            prevSelected.classList.remove('ring-2', 'ring-primary', 'bg-primary/5');
        }
    }
    
    // Agregar selección nueva
    if (selectedProductId === productId) {
        selectedProductId = null;
    } else {
        selectedProductId = productId;
        button.classList.add('ring-2', 'ring-primary', 'bg-primary/5');
    }
};

export function initInventory() {
    console.log('Inventario inicializado');
    
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            inventorySearchQuery = e.target.value.toLowerCase();
            renderInventory();
        });
    }

    const addBtn = document.getElementById('add-product-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addNewProduct);
    }

    // Inicializar modal de producto
    initProductModal();

    renderInventory();
}

// Inicializar modal de producto
function initProductModal() {
    const modal = document.getElementById('product-modal');
    const cancelBtn = document.getElementById('product-cancel');
    const saveBtn = document.getElementById('product-save');
    const defaultImageBtn = document.getElementById('use-default-image');
    const nameInput = document.getElementById('product-name');
    const imageInput = document.getElementById('product-image');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeProductModal);
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProductFromModal);
    }
    
    if (defaultImageBtn) {
        defaultImageBtn.addEventListener('click', async () => {
            const name = nameInput.value.trim();
            if (!name) {
                showToast('Primero ingresa el nombre del producto', 'warning');
                return;
            }

            // Mostrar loading
            defaultImageBtn.disabled = true;
            defaultImageBtn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Buscando...';
            
            // Buscar imagen en Unsplash
            const imageUrl = await searchUnsplashImage(name);
            
            if (imageUrl) {
                imageInput.value = imageUrl;
                showToast('Imagen encontrada!', 'success');
            } else {
                showToast('No se encontró imagen, usa una URL manual', 'warning');
            }
            
            // Restaurar botón
            defaultImageBtn.disabled = false;
            defaultImageBtn.innerHTML = 'Por defecto';
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // Cerrar al hacer clic fuera
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeProductModal();
            }
        });
    }
}

// Abrir modal de producto
window.openProductModal = (productId = null) => {
    const modal = document.getElementById('product-modal');
    const titleEl = document.getElementById('product-modal-title').querySelector('span');
    const idInput = document.getElementById('product-id');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const stockInput = document.getElementById('product-stock');
    const categorySelect = document.getElementById('product-category');
    const imageInput = document.getElementById('product-image');
    
    // Resetear formulario
    idInput.value = '';
    nameInput.value = '';
    priceInput.value = '';
    stockInput.value = '';
    categorySelect.value = 'cervezas';
    imageInput.value = '';

    if (productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        titleEl.textContent = 'Editar Producto';
        idInput.value = product.id;
        nameInput.value = product.name;
        priceInput.value = product.price;
        stockInput.value = product.stock;
        categorySelect.value = product.category;
        imageInput.value = product.image || '';
    } else {
        titleEl.textContent = 'Nuevo Producto';
    }
    
    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
};

// Cerrar modal de producto
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
window.closeProductModal = closeProductModal;

// Guardar producto desde modal
async function saveProductFromModal() {
    const idInput = document.getElementById('product-id');
    const nameInput = document.getElementById('product-name');
    const priceInput = document.getElementById('product-price');
    const stockInput = document.getElementById('product-stock');
    const categorySelect = document.getElementById('product-category');
    const imageInput = document.getElementById('product-image');
    
    const name = nameInput.value.trim();
    const price = parseInt(priceInput.value);
    const stock = parseInt(stockInput.value);
    const category = categorySelect.value;
    let image = imageInput.value.trim();

    if (!name || isNaN(price) || isNaN(stock) || price <= 0 || stock < 0) {
        showToast('Por favor, completa todos los campos correctamente', 'error');
        return;
    }

    // Si no hay imagen, buscar automáticamente
    if (!image) {
        showToast('Buscando imagen...', 'info');
        image = await searchUnsplashImage(name);
        
        if (!image) {
            // Si no encuentra, usar placeholder con el nombre
            const imageText = name.replace(/[^a-zA-Z0-9]/g, '+').substring(0, 15);
            image = `https://placehold.co/400x400/18181b/10b981?text=${imageText}`;
            showToast('Usando imagen por defecto', 'info');
        } else {
            showToast('Imagen encontrada automáticamente', 'success');
        }
    }

    if (idInput.value) {
        // EDITAR PRODUCTO EXISTENTE
        const product = products.find(p => p.id === idInput.value);
        if (product) {
            product.name = name;
            product.price = price;
            product.stock = stock;
            product.category = category;
            product.image = image;
            showToast('Producto actualizado', 'success');
        }
    } else {
        // CREAR NUEVO PRODUCTO
        let maxNum = 0;
        products.forEach(p => {
            const num = parseInt(p.id.replace(/[Pp]/g, ''));
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        const newId = 'p' + (maxNum + 1);
        
        const newProd = {
            id: newId,
            name: name,
            price: price,
            stock: stock,
            category: category,
            image: image
        };
        products.push(newProd);
        showToast('Producto agregado', 'success');
    }
    
    saveInventory();
    renderInventory();
    if (window.renderProducts) window.renderProducts();
    closeProductModal();
}

// FUNCIÓN PARA CAMBIAR EL ORDEN AL HACER CLIC EN EL ID
window.toggleInventoryOrder = () => {
    inventorySortOrder = inventorySortOrder === 'asc' ? 'desc' : 'asc';
    renderInventory();
};

export function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    const mobileGrid = document.getElementById('inventory-mobile-grid');
    
    if (!tbody && !mobileGrid) return;
    
    let filtered = products.filter(p => 
        p.name.toLowerCase().includes(inventorySearchQuery) || 
        p.id.toLowerCase().includes(inventorySearchQuery)
    );

    filtered.sort((a, b) => {
        const numA = parseInt(a.id.replace(/[Pp]/g, '')) || 0;
        const numB = parseInt(b.id.replace(/[Pp]/g, '')) || 0;
        return inventorySortOrder === 'asc' ? numA - numB : numB - numA;
    });

    // Renderizar tabla para desktop
    if (tbody) {
        tbody.innerHTML = filtered.map(p => `
            <tr class="border-b border-border hover:bg-surfaceHover/50 transition-colors">
                <td class="px-6 py-4 text-xs font-mono text-textMuted">${p.id.toUpperCase()}</td>
                <td class="px-6 py-4 font-medium">
                    <div class="flex items-center gap-2">
                        <img src="${p.image || 'https://placehold.co/40x40/18181b/10b981?text=' + p.name.charAt(0)}" 
                             class="w-8 h-8 rounded-lg object-cover"
                             onerror="this.src='https://placehold.co/40x40/18181b/10b981?text=?'">
                        ${p.name}
                    </div>
                </td>
                <td class="px-6 py-4 text-textMuted capitalize">${p.category}</td>
                <td class="px-6 py-4">${formatCurrency(p.price)}</td>
                <td class="px-6 py-4">
                    <button onclick="window.selectProduct('${p.id}', this)" 
                            data-product-id="${p.id}"
                            class="stock-btn px-3 py-1 rounded-lg transition-all ${p.stock < 10 ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-surfaceHover text-textMain hover:bg-primary/20'} ${selectedProductId === p.id ? 'ring-2 ring-primary bg-primary/5' : ''}">
                        ${p.stock}
                    </button>
                </td>
                <td class="px-6 py-4 text-right">
                    <button onclick="window.editProduct('${p.id}')" class="p-2 hover:bg-surface rounded-lg text-textMuted hover:text-primary transition-colors">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteProduct('${p.id}')" class="p-2 hover:bg-surface rounded-lg text-textMuted hover:text-red-400 transition-colors">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // Renderizar grid para móvil
    if (mobileGrid) {
        mobileGrid.innerHTML = filtered.map(p => `
            <div class="bg-surface border border-border rounded-xl p-4">
                <div class="flex items-start gap-3">
                    <img src="${p.image || 'https://placehold.co/60x60/18181b/10b981?text=' + p.name.charAt(0)}" 
                         class="w-14 h-14 rounded-lg object-cover"
                         onerror="this.src='https://placehold.co/60x60/18181b/10b981?text=?'">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                            <div>
                                <span class="text-xs text-textMuted">${p.id.toUpperCase()}</span>
                                <h3 class="font-medium text-sm line-clamp-2">${p.name}</h3>
                            </div>
                            <span class="text-primary font-bold text-sm">${formatCurrency(p.price)}</span>
                        </div>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-xs px-2 py-1 bg-surfaceHover rounded-full capitalize">${p.category}</span>
                            <button onclick="window.selectProduct('${p.id}', this)" 
                                    data-product-id="${p.id}"
                                    class="stock-btn px-3 py-1 text-xs rounded-lg transition-all ${p.stock < 10 ? 'bg-red-500/20 text-red-400' : 'bg-surfaceHover text-textMain'} ${selectedProductId === p.id ? 'ring-2 ring-primary bg-primary/5' : ''}">
                                Stock: ${p.stock}
                            </button>
                        </div>
                        <div class="flex gap-2 mt-3">
                            <button onclick="window.editProduct('${p.id}')" class="flex-1 py-2 bg-surfaceHover rounded-lg text-xs hover:text-primary transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="edit-2" class="w-3 h-3"></i>
                                Editar
                            </button>
                            <button onclick="window.deleteProduct('${p.id}')" class="flex-1 py-2 bg-surfaceHover rounded-lg text-xs hover:text-red-400 transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="trash-2" class="w-3 h-3"></i>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    if (window.lucide) window.lucide.createIcons();
}

// FUNCIONES DE GESTIÓN
function addNewProduct() {
    window.openProductModal();
}

window.editProduct = (id) => {
    window.openProductModal(id);
};

window.deleteProduct = (id) => {
    // Crear un modal de confirmación simple
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-surface rounded-2xl w-full max-w-md p-6 border border-border shadow-2xl">
            <h3 class="text-lg font-bold mb-2">Confirmar eliminación</h3>
            <p class="text-textMuted text-sm">¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.</p>
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
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products.splice(index, 1);
            saveInventory();
            renderInventory();
            if (window.renderProducts) window.renderProducts();
            showToast('Producto eliminado', 'info');
        }
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};