const layout = require('./machine-layout.json');

// Flatten the hierarchical layout into a flat inventory array
const flatInventory = layout.rows.flatMap(row =>
  row.slots.map(slot => ({
    id: slot.id,
    name: slot.name,
    price: slot.price,
    count: slot.initial_count,
    max: slot.capacity,
    color: slot.color,
    image_type: slot.image_type
  }))
);

module.exports = flatInventory;
