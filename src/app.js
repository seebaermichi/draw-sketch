import Alpine from 'alpinejs'
import drawingApp from './drawing-app'

window.Alpine = Alpine
Alpine.data('drawingApp', drawingApp)
Alpine.start()
