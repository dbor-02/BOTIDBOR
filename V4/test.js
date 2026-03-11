// test.js - Copia y pega en la consola del navegador para probar

// 1. Verificar productos con stock bajo
function checkLowStock() {
    const lowStock = products.filter(p => p.stock < 10);
    console.log('Productos con stock bajo:', lowStock);
    return lowStock;
}

// 2. Simular una venta rápida
function simulateSale(productId, quantity = 1) {
    import('./cart.js').then(module => {
        for(let i = 0; i < quantity; i++) {
            module.addToCart(productId);
        }
        console.log(`Venta simulada: ${quantity} unidades de ${productId}`);
    });
}

// 3. Ver total del carrito
function checkCartTotal() {
    import('./cart.js').then(module => {
        const total = module.cartItems.reduce((sum, item) => 
            sum + (item.price * item.quantity), 0);
        console.log('Total carrito:', formatCurrency(total));
        return total;
    });
}

// 4. Resetear inventario (vuelve a los valores originales)
function resetInventory() {
    // Aquí pondrías los valores originales de products
    location.reload(); // Por ahora, solo recargar
}

// 5. Exportar inventario a JSON
function exportInventory() {
    const data = {
        products: products,
        categories: categories,
        date: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    console.log('Inventario exportado');
}