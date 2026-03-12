import { products, formatCurrency, saveInventory } from './data.js';
import { showToast } from './utils.js';

// VARIABLES DE ESTADO PARA FILTRO Y ORDEN
let inventorySearchQuery = '';
let inventorySortOrder = 'asc';
let selectedProductId = null;

// ===== CONFIGURACIÓN DE SERPAPI =====
// IMPORTANTE: Regístrate gratis en https://serpapi.com y obtén tu API key
// El plan gratis incluye 100 búsquedas por mes
const SERPAPI_API_KEY = '9e13ac1c723f1ff23bd84c4ffa300407c3605385f406e1a9179e448c4d44b035'; // Reemplaza con tu key

// Función para buscar imagen en Google usando SerpAPI
async function searchGoogleImage(productName) {
    try {
        // Usar un proxy CORS gratuito
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(productName)}&api_key=${SERPAPI_API_KEY}&num=1&gl=cl&hl=es`;
        
        const response = await fetch(proxyUrl + targetUrl);
        const data = await response.json();
        
        if (data.images_results && data.images_results.length > 0) {
            return data.images_results[0].original;
        }
    } catch (error) {
        console.error('Error buscando imagen en Google:', error);
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
            
            // Buscar imagen en Google
            const imageUrl = await searchGoogleImage(name);
            
            if (imageUrl) {
                imageInput.value = imageUrl;
                showToast('Imagen encontrada en Google!', 'success');
            } else {
                // Si no encuentra, usar placeholder con el nombre
                const imageText = name.replace(/[^a-zA-Z0-9]/g, '+').substring(0, 15);
                imageInput.value = `https://placehold.co/400x400/18181b/10b981?text=${imageText}`;
                showToast('No se encontró imagen, usando placeholder', 'warning');
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
        showToast('Buscando imagen en Google...', 'info');
        image = await searchGoogleImage(name);
        
        if (!image) {
            // Si no encuentra, usar placeholder con el nombre
            const imageText = name.replace(/[^a-zA-Z0-9]/g, '+').substring(0, 15);
            image = `https://placehold.co/400x400/18181b/10b981?text=${imageText}`;
            showToast('No se encontró imagen, usando placeholder', 'info');
        } else {
            showToast('Imagen encontrada en Google!', 'success');
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
        // Encontrar el índice del producto a eliminar
        const index = products.findIndex(p => p.id === id);
        
        if (index !== -1) {
            // Eliminar el producto
            products.splice(index, 1);
            
            // REORDENAR IDs: Recorrer todos los productos desde el índice eliminado
            for (let i = index; i < products.length; i++) {
                // Extraer el número actual del ID (ej: de "P6" sacar 6)
                const currentNum = parseInt(products[i].id.replace(/[Pp]/g, ''));
                // El nuevo número debería ser i + 1 (porque los índices empiezan en 0)
                const newNum = i + 1;
                
                // Solo actualizar si el número cambió
                if (currentNum !== newNum) {
                    products[i].id = 'p' + newNum;
                }
            }
            
            saveInventory();
            renderInventory();
            if (window.renderProducts) window.renderProducts();
            showToast('Producto eliminado y IDs reordenados', 'info');
        }
        
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};