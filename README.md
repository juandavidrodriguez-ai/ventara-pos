# VENTARA POS

Sistema universal de punto de venta y gestión comercial. Esta entrega es una aplicación web funcional de primera fase basada en las especificaciones del PDF de VENTARA POS.

## Incluye
- Dashboard con indicadores calculados de datos reales.
- POS rápido con búsqueda, carrito, descuentos y medios de pago.
- Ventas, historial, devolución y ticket imprimible.
- Artículos, códigos, categorías, costos, precios y stock.
- Inventario y Kardex.
- Compras y cuentas por pagar.
- Proveedores.
- Clientes, ventas a crédito y cartera.
- Abonos.
- Cotizaciones y conversión al POS.
- Caja y gastos.
- Reportes y auditoría.
- Usuarios y roles base.
- Pedidos con estados.
- Catálogo digital.
- Configuración empresarial.
- Exportación CSV.
- Respaldo/importación JSON.
- Arquitectura preparada para integración posterior de facturación electrónica; no simula conexión DIAN.

## Ejecutar sin instalar
1. Descomprime el proyecto.
2. Abre `index.html` en Chrome o Edge.
3. Los datos quedan guardados en el navegador mediante localStorage.

## Subir a GitHub
Repositorio destino: `juandavidrodriguez-ai/ventara-pos`

```bash
git clone https://github.com/juandavidrodriguez-ai/ventara-pos.git
cd ventara-pos
# copia aquí los archivos del proyecto
git add .
git commit -m "feat: primera versión funcional VENTARA POS"
git push origin main
```

## Siguiente fase recomendada
Separar frontend/backend, agregar API y base de datos PostgreSQL, autenticación real, permisos por acción, múltiples líneas por compras/cotizaciones/pedidos, impuestos, múltiples bodegas, cierres detallados y conector real con proveedor de facturación electrónica.


## VENTARA POS v3
- Menú operativo renombrado a **Facturar**; **Ventas** queda para historial.
- ENTER en el módulo de Facturar abre directamente **Cobrar factura**; ENTER ya no suma cantidades.
- + aumenta y − disminuye cantidades.
- Cobro con efectivo, tarjeta, transferencia, mixto y crédito.
- Al confirmar desde ENTER se registra y abre/imprime el ticket POS.
- Productos con unidades UND, G, KG, ML, L, M, CM, CAJA y PAQ.
- Presentación y contenido/gramaje configurables.
- Gramera/báscula: ingreso de peso y opción de conexión Web Serial cuando el dispositivo/navegador lo soporte.
- Configuración de impresora POS, lector de códigos, cajón monedero y gramera.
- Prueba de impresión y comando ESC/POS de apertura de cajón cuando existe conexión serial compatible.

> Nota de hardware: un navegador web no puede controlar de forma universal cualquier impresora USB, cajón o báscula. VENTARA deja la configuración y las interfaces preparadas; para equipos USB que no expongan Web Serial se recomienda un pequeño puente local ESC/POS.

<!-- repair trigger -->
