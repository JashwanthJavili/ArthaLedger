// Chaining Hash Table for Category Aggregation
class HashNode {
  constructor(key, value) {
    this.key = key;     // category name
    this.value = value; // total amount
    this.next = null;   // pointer for chaining
  }
}

export class ChainingHashTable {
  constructor(size = 37) {
    this.size = size;
    this.buckets = new Array(size).fill(null);
  }

  // Simple polynomial rolling hash function
  _hash(key) {
    let hash = 0;
    const str = String(key);
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % this.size;
    }
    return hash;
  }

  // Insert or update category amount
  add(key, amount) {
    const index = this._hash(key);
    let current = this.buckets[index];

    while (current !== null) {
      if (current.key === key) {
        current.value += amount;
        return;
      }
      current = current.next;
    }

    // Key not found, insert at the head of the chain (chaining collision resolution)
    const newNode = new HashNode(key, amount);
    newNode.next = this.buckets[index];
    this.buckets[index] = newNode;
  }

  // Convert all aggregated data to an array of objects { name, value }
  toArray() {
    const result = [];
    for (let i = 0; i < this.size; i++) {
      let current = this.buckets[i];
      while (current !== null) {
        result.push({ name: current.key, value: current.value });
        current = current.next;
      }
    }
    return result;
  }
}

// Max Heap for Priority Queue / Sorting
export class MaxHeap {
  constructor() {
    this.heap = [];
  }

  getParentIndex(index) { return Math.floor((index - 1) / 2); }
  getLeftChildIndex(index) { return 2 * index + 1; }
  getRightChildIndex(index) { return 2 * index + 2; }

  swap(index1, index2) {
    const temp = this.heap[index1];
    this.heap[index1] = this.heap[index2];
    this.heap[index2] = temp;
  }

  insert(item) {
    this.heap.push(item); // item is { name, value }
    this.heapifyUp(this.heap.length - 1);
  }

  heapifyUp(index) {
    let currentIndex = index;
    let parentIndex = this.getParentIndex(currentIndex);

    while (currentIndex > 0 && this.heap[currentIndex].value > this.heap[parentIndex].value) {
      this.swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
      parentIndex = this.getParentIndex(currentIndex);
    }
  }

  extractMax() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();

    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return max;
  }

  heapifyDown(index) {
    let currentIndex = index;
    let leftIndex = this.getLeftChildIndex(currentIndex);
    let rightIndex = this.getRightChildIndex(currentIndex);
    let largestIndex = currentIndex;

    const length = this.heap.length;

    if (leftIndex < length && this.heap[leftIndex].value > this.heap[largestIndex].value) {
      largestIndex = leftIndex;
    }

    if (rightIndex < length && this.heap[rightIndex].value > this.heap[largestIndex].value) {
      largestIndex = rightIndex;
    }

    if (largestIndex !== currentIndex) {
      this.swap(currentIndex, largestIndex);
      this.heapifyDown(largestIndex);
    }
  }

  size() {
    return this.heap.length;
  }
}

// Helper to aggregate entries and sort using our custom DSA
export function aggregateAndSortCategories(entries, hiddenCategoriesSet, type = 'income') {
  const table = new ChainingHashTable();

  // 1. Filter and Aggregate
  for (const entry of entries) {
    // Process only matching entry type (income or expense)
    if (entry.type !== type) continue;
    if (entry.isTransfer) continue;

    const category = entry.category || 'General';
    // Exclude if it's hidden
    if (hiddenCategoriesSet.has(category)) {
      continue;
    }
    table.add(category, Number(entry.amount) || 0);
  }

  // 2. Insert into Max Heap
  const heap = new MaxHeap();
  const aggregatedArray = table.toArray();
  for (const item of aggregatedArray) {
    heap.insert(item);
  }

  // 3. Extract in sorted order
  const sorted = [];
  while (heap.size() > 0) {
    sorted.push(heap.extractMax());
  }

  return sorted;
}
