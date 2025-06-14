# Phase 1: Zero-Friction Order Entry - Revised UX Design Document

## 🎯 Overview

Phase 1 focuses on creating an ultra-fast order entry system for operators taking customer orders via phone calls or WhatsApp. The core principle is **following the natural phone conversation flow** - customers lead with what they want, then identify themselves.

### **Business Goals**
- Minimize order entry time to 30-45 seconds
- Follow natural conversation patterns
- Handle customer identification efficiently using operator's phone contacts
- Maintain data quality through smart defaults and address validation

### **Target User**
**Operator**: Takes customer calls, needs to capture order information quickly while maintaining excellent customer service.

## 📞 Natural Conversation Flow

The UI mirrors the actual phone conversation flow:

```
Real Phone Conversation         →    UI Step
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"I need 2 tanks of 20kg"       →    Step 1: Item Selection
"What's your name?"             →    Step 2: Customer Search
"Same address as usual?"        →    Step 3: Address Confirmation
"How will you pay?"             →    Step 4: Payment Method
"Perfect, we'll deliver today" →    Save as PENDING
```

## 🎨 Revised UI Flow Design

### **Step 1: Order Items First (What Customer Wants)**

```
┌─────────────────────────────────────────────────────────┐
│ New Order - What do they need?                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ TANKS                                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │  10kg  │ │  20kg  │ │  45kg  │ │ Other  │            │
│ │   [+]  │ │   [2]  │ │   [+]  │ │   [+]  │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                         │
│ ACCESSORIES                                             │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │Regulator│ │ Hose   │ │Valve   │ │ Other  │            │
│ │   [+]  │ │   [+]  │ │   [+]  │ │   [+]  │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                         │
│ ORDER: 2x 20kg tanks                                    │
│                                                         │
│                                      [Continue]        │
└─────────────────────────────────────────────────────────┘
```

**Why Start Here:**
- **Natural conversation flow**: Customers call saying "I need X tanks"
- **Immediate capture**: Record the order while customer is talking
- **Fast start**: No delays asking for identification first
- **Clear focus**: Operator and customer aligned on what's being ordered

**Features:**
- **Visual selection**: Big buttons, no dropdowns or typing
- **Tap to add**: Single tap adds item, tap again increases quantity
- **Common items**: Pre-configured popular products
- **"Other" option**: Free text for non-standard items
- **Running total**: Live feedback of selected items

### **Step 2: Customer Identification (Name Search)**

```
┌─────────────────────────────────────────────────────────┐
│ New Order - Customer Name                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ What's the customer's name?                             │
│                                                         │
│ 🔍 Search: [Pedro Martinez...      ] [Clear]           │
│                                                         │
│ FOUND CUSTOMERS                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Pedro Martinez                                   │ │
│ │    📞 987-654-321  📍 Jr. Lima 123, San Isidro     │ │
│ │    📦 Last order: 2x 20kg (1 week ago)             │ │
│ │    💰 Usually pays: Cash                            │ │
│ │                                        [Select]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ 🆕 New Customer (Pedro Martinez)                        │
└─────────────────────────────────────────────────────────┘
```

**Why This Works:**
- **Operator reads from phone**: Operator has customer name in phone contacts
- **Simple name search**: Just type the name, no complex lookup
- **Rich customer info**: Shows address, last order, payment preference
- **Quick recognition**: Operator can confirm "Pedro from Jr. Lima 123?"
- **New customer option**: If not found, create new customer inline

### **Step 3: Address Confirmation (Quick Validation)**

```
┌─────────────────────────────────────────────────────────┐
│ New Order - Delivery Address                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Confirm delivery address with Pedro:                    │
│                                                         │
│ 📍 CURRENT ADDRESS                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Jr. Lima 123, San Isidro                            │ │
│ │ Ref: Cerca al parque central                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ✅ Same address    📝 Update address                    │
│                                                         │
│ NEW/DIFFERENT ADDRESS                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Type new delivery address...                        │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                                      [Continue]        │
└─────────────────────────────────────────────────────────┘
```

**For New Customers:**
```
┌─────────────────────────────────────────────────────────┐
│ New Order - Delivery Address                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Delivery address for Sofia Rodriguez:                   │
│                                                         │
│ Phone: [987-555-444          ]                         │
│                                                         │
│ Address:                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Av. Arequipa 456, Miraflores                        │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Reference: [Near the shopping mall     ]                │
│                                                         │
│                                      [Continue]        │
└─────────────────────────────────────────────────────────┘
```
- **Skip option**: For anonymous/quick orders
- **Smart validation**: Peruvian phone format recognition

**Auto-fill Logic:**
```vue
<script setup>
import { ref, watch } from 'vue'
import { findCustomerByPhone } from '@/services/customerService'

const customerPhone = ref('')
const customerName = ref('')
const previousAddress = ref('')

watch(customerPhone, async (newPhone) => {
  if (newPhone.length >= 9) { // Peruvian phone numbers
    const customer = await findCustomerByPhone(newPhone)
    if (customer) {
      customerName.value = customer.name
      previousAddress.value = customer.lastDeliveryAddress
    }
  }
})
</script>
```

**Item Selection Logic:**
```vue
<script setup>
import { ref, computed } from 'vue'

const COMMON_ITEMS = [
  { type: 'tank', name: '10kg Tank', defaultPrice: '25.00' },
  { type: 'tank', name: '20kg Tank', defaultPrice: '45.00' },
  { type: 'tank', name: '45kg Tank', defaultPrice: '85.00' },
  { type: 'item', name: 'Regulator', defaultPrice: '15.00' },
  { type: 'item', name: 'Gas Hose', defaultPrice: '12.00' },
]

const selectedItems = ref([])

const addItem = (item) => {
  const existing = selectedItems.value.find(i => i.name === item.name)
  if (existing) {
    existing.quantity += 1
  } else {
    selectedItems.value.push({ ...item, quantity: 1 })
  }
}

const orderSummary = computed(() => {
  return selectedItems.value.map(item =>
    `${item.quantity}x ${item.name}`
  ).join(', ')
})
</script>

<template>
  <div class="order-items">
    <h3>What do they need?</h3>

    <section class="tanks">
      <h4>TANKS</h4>
      <div class="item-grid">
        <button
          v-for="tank in COMMON_ITEMS.filter(i => i.type === 'tank')"
          :key="tank.name"
          @click="addItem(tank)"
          class="item-button"
        >
          <div class="item-name">{{ tank.name.replace(' Tank', '') }}</div>
          <div class="quantity">
            {{ selectedItems.find(i => i.name === tank.name)?.quantity || '+' }}
          </div>
        </button>
      </div>
    </section>

    <section class="accessories">
      <h4>ACCESSORIES</h4>
      <div class="item-grid">
        <button
          v-for="accessory in COMMON_ITEMS.filter(i => i.type === 'item')"
          :key="accessory.name"
          @click="addItem(accessory)"
          class="item-button"
        >
          <div class="item-name">{{ accessory.name }}</div>
          <div class="quantity">
            {{ selectedItems.find(i => i.name === accessory.name)?.quantity || '+' }}
          </div>
        </button>
      </div>
    </section>

    <div class="order-summary">
      ORDER: {{ orderSummary || 'No items selected' }}
    </div>
  </div>
</template>
```

### **Step 4: Payment (One-Click Selection)**

```
┌─────────────────────────────────────────────────────────┐
│ New Order - Step 4 of 4                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ How will they pay?                                      │
│                                                         │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │  💰    │ │  📱    │ │  📱    │ │  🏦    │            │
│ │  Cash  │ │  Yape  │ │  Plin  │ │Transfer│            │
│ │   [✓]  │ │   [ ]  │ │   [ ]  │ │   [ ]  │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
│                                                         │
│ Notes (optional):                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Special instructions, delivery notes...             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                    [Save Order] [Start Next]           │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- **Visual payment buttons**: Icons + text for clarity
- **Smart defaults**: Cash pre-selected (most common)
- **Optional notes**: Last step, not required
- **Immediate next order**: "Start Next" button for continuous flow

## 💾 Data Model for Phase 1

### **Minimal Order Entry Structure**

```vue
<script setup>
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStoreStore } from '@/stores/store'

// Composables
const authStore = useAuthStore()
const storeStore = useStoreStore()

// Order entry reactive state
const orderEntry = reactive({
  // Step 1: Item selection (following natural conversation flow)
  items: [], // QuickItem[]

  // Step 2: Customer Identity
  customerPhone: '',
  customerName: '',

  // Step 3: Delivery Location
  deliveryAddress: '',
  locationReference: '',

  // Step 4: Payment
  paymentMethod: 'cash', // Default to most common
  notes: '',

  // Auto-populated (operator never sees)
  storeId: computed(() => storeStore.currentStore?.storeId),
  createdBy: computed(() => authStore.user?.userId),
  status: 'pending',
  priority: 1,
  paymentStatus: 'pending',
  orderDate: new Date()
})

// Type definitions for TypeScript support
interface QuickItem {
  type: 'tank' | 'item'
  name: string
  quantity: number
  defaultPrice?: string
}

type PaymentMethod = 'cash' | 'yape' | 'plin' | 'transfer'
</script>
```

### **Smart Defaults Logic**

```vue
<script setup>
import { ref, watch, computed } from 'vue'
import { debounce } from 'lodash-es'
import { saveOrderAsDraft } from '@/services/orderService'

// Payment status based on method
const getDefaultPaymentStatus = (method) => {
  switch (method) {
    case 'cash': return 'pending'     // Pay on delivery
    case 'yape':
    case 'plin':
    case 'transfer': return 'pending' // Confirm before delivery
    default: return 'pending'
  }
}

// Auto-save during entry (debounced)
const autoSaveOrder = debounce(async (orderData) => {
  try {
    await saveOrderAsDraft(orderData)
    console.log('Draft saved automatically')
  } catch (error) {
    console.error('Failed to save draft:', error)
  }
}, 2000)

// Watch for changes and auto-save
watch(
  () => orderEntry,
  (newOrderData) => {
    autoSaveOrder({ ...newOrderData })
  },
  { deep: true }
)

// Computed payment status
const paymentStatus = computed(() =>
  getDefaultPaymentStatus(orderEntry.paymentMethod)
)
</script>
```

## 🎯 Operator Experience Goals

### **Target Metrics**
- **Order Entry Time**: 30-60 seconds per order
- **Required Clicks**: 8-12 clicks maximum
- **Cognitive Load**: Zero - follows natural conversation flow
- **Error Rate**: < 5% (corrected in later phases)
- **Call Handling**: 3x improvement in calls per hour

### **Operator Workflow**
1. **Answer phone** → **Open new order** (1 click)
2. **Capture phone** → **Auto-fill customer** (voice/type)
3. **Confirm address** → **Use previous or voice input**
4. **Select items** → **Visual tap selection**
5. **Choose payment** → **One-click selection**
6. **Save & continue** → **Immediate next order**

### **System Intelligence Features**
- **Customer Recognition**: Instant lookup by phone number
- **Address Memory**: Previous delivery addresses available
- **Usage Patterns**: Most common items displayed first
- **Smart Defaults**: Pre-select common options
- **Auto-Save**: Continuous draft saving, never lose data
- **Voice Integration**: Hands-free operation during calls

## 🚀 Technical Implementation Strategy

### **Vue 3 Frontend Architecture**
- **Vue 3 Composition API**: Modern reactive state management
- **Single Page App**: No page reloads during order flow
- **Progressive Enhancement**: Works without JavaScript fallback
- **Mobile-First**: Responsive design for tablet/phone use
- **Voice API**: Web Speech API integration for voice input
- **Offline Support**: Service Worker + Pinia persistence
- **TypeScript**: Full type safety with Vue 3 + TypeScript

### **Vue 3 Component Structure**
```vue
<!-- OrderEntryFlow.vue - Main container -->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/orderStore'
import { useAuthStore } from '@/stores/authStore'

// Child components
import ItemSelection from './steps/ItemSelection.vue'
import CustomerSearch from './steps/CustomerSearch.vue'
import AddressConfirmation from './steps/AddressConfirmation.vue'
import PaymentMethod from './steps/PaymentMethod.vue'

const router = useRouter()
const orderStore = useOrderStore()
const authStore = useAuthStore()

const currentStep = ref(1)
const totalSteps = 4

const orderData = reactive({
  items: [],
  customerPhone: '',
  customerName: '',
  deliveryAddress: '',
  paymentMethod: 'cash',
  notes: ''
})

const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1: return orderData.items.length > 0
    case 2: return orderData.customerPhone.length >= 9
    case 3: return orderData.deliveryAddress.trim().length > 0
    case 4: return orderData.paymentMethod !== ''
    default: return false
  }
})

const nextStep = () => {
  if (canProceed.value && currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const submitOrder = async () => {
  try {
    await orderStore.createQuickOrder(orderData)
    router.push('/orders/success')
  } catch (error) {
    console.error('Failed to create order:', error)
  }
}
</script>

<template>
  <div class="order-entry-container">
    <header class="order-header">
      <h1>New Order - Step {{ currentStep }} of {{ totalSteps }}</h1>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
        ></div>
      </div>
    </header>

    <main class="order-content">
      <Transition name="slide" mode="out-in">
        <ItemSelection
          v-if="currentStep === 1"
          v-model="orderData.items"
          @next="nextStep"
        />
        <CustomerSearch
          v-else-if="currentStep === 2"
          v-model:phone="orderData.customerPhone"
          v-model:name="orderData.customerName"
          @next="nextStep"
          @prev="prevStep"
        />
        <AddressConfirmation
          v-else-if="currentStep === 3"
          v-model="orderData.deliveryAddress"
          :customer-name="orderData.customerName"
          @next="nextStep"
          @prev="prevStep"
        />
        <PaymentMethod
          v-else-if="currentStep === 4"
          v-model:method="orderData.paymentMethod"
          v-model:notes="orderData.notes"
          @submit="submitOrder"
          @prev="prevStep"
        />
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
```

### **Pinia State Management**
```typescript
// stores/orderStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { QuickOrderEntry, OrderItem } from '@/types/order'

export const useOrderStore = defineStore('order', () => {
  // State
  const currentOrder = ref<QuickOrderEntry | null>(null)
  const recentOrders = ref<QuickOrderEntry[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const hasActiveOrder = computed(() => currentOrder.value !== null)
  const orderTotal = computed(() => {
    if (!currentOrder.value?.items) return 0
    return currentOrder.value.items.reduce((sum, item) =>
      sum + (parseFloat(item.defaultPrice || '0') * item.quantity), 0
    )
  })

  // Actions
  const createQuickOrder = async (orderData: QuickOrderEntry) => {
    try {
      isLoading.value = true
      error.value = null

      const response = await fetch('/api/v1/orders/quick-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) throw new Error('Failed to create order')

      const newOrder = await response.json()
      recentOrders.value.unshift(newOrder)
      currentOrder.value = null

      return newOrder
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const saveDraft = async (orderData: Partial<QuickOrderEntry>) => {
    currentOrder.value = { ...currentOrder.value, ...orderData }

    // Auto-save to backend (debounced)
    try {
      await fetch('/api/v1/orders/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentOrder.value)
      })
    } catch (err) {
      console.warn('Draft save failed:', err)
    }
  }

  return {
    currentOrder,
    recentOrders,
    isLoading,
    error,
    hasActiveOrder,
    orderTotal,
    createQuickOrder,
    saveDraft
  }
})
```

### **Performance Requirements**
- **Page Load**: < 2 seconds
- **Auto-complete**: < 200ms response time
- **Auto-save**: Debounced every 2 seconds
- **Voice Recognition**: Real-time processing with Web Speech API
- **Customer Lookup**: < 500ms query response with caching
- **Component Transitions**: Smooth 300ms animations
- **Bundle Size**: < 500KB initial load with code splitting

### **Backend Integration**
```vue
<script setup>
import { ref } from 'vue'
import { useApi } from '@/composables/useApi'

const { post, get } = useApi()

// API endpoints for Phase 1
const saveQuickOrder = async (orderData) => {
  return await post('/api/v1/orders/quick-entry', orderData)
}

const findCustomerByPhone = async (phone) => {
  return await get(`/api/v1/customers/by-phone?phone=${phone}`)
}

const getStoreItems = async (storeId) => {
  return await get(`/api/v1/stores/${storeId}/items`)
}

const saveOrderDraft = async (draftData) => {
  return await post('/api/v1/orders/draft', draftData)
}

// Usage in component
const isLoading = ref(false)
const error = ref(null)

const submitOrder = async () => {
  try {
    isLoading.value = true
    error.value = null

    const result = await saveQuickOrder(orderEntry)

    // Handle success
    console.log('Order saved:', result)
    resetForm()

  } catch (err) {
    error.value = err.message
    console.error('Failed to save order:', err)
  } finally {
    isLoading.value = false
  }
}
</script>
```

### **Voice Integration with Web Speech API**
```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isListening = ref(false)
const transcript = ref('')
const recognition = ref(null)

const startVoiceInput = () => {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Voice input not supported in this browser')
    return
  }

  recognition.value = new webkitSpeechRecognition()
  recognition.value.continuous = false
  recognition.value.interimResults = false
  recognition.value.lang = 'es-PE' // Peruvian Spanish

  recognition.value.onstart = () => {
    isListening.value = true
  }

  recognition.value.onresult = (event) => {
    const result = event.results[0][0].transcript
    transcript.value = result
    // Auto-fill the address field
    emit('voice-input', result)
  }

  recognition.value.onend = () => {
    isListening.value = false
  }

  recognition.value.start()
}

const stopVoiceInput = () => {
  if (recognition.value) {
    recognition.value.stop()
  }
}

onUnmounted(() => {
  stopVoiceInput()
})
</script>

<template>
  <div class="voice-input">
    <button
      @click="isListening ? stopVoiceInput() : startVoiceInput()"
      :class="{ listening: isListening }"
      class="voice-button"
    >
      🎤 {{ isListening ? 'Listening...' : 'Voice Input' }}
    </button>
    <div v-if="transcript" class="transcript">
      Heard: "{{ transcript }}"
    </div>
  </div>
</template>
```

## 📱 UX Principles Applied

### **Core Principles**
1. **Follow Natural Flow**: UI matches phone conversation sequence
2. **Minimize Typing**: Visual selection over text input
3. **Smart Defaults**: System makes intelligent assumptions
4. **Error Tolerance**: Perfect data not required, fix later
5. **Immediate Feedback**: Real-time updates and confirmations
6. **Context Preservation**: Remember customer patterns and preferences
7. **One-Handed Operation**: Large touch targets, simple navigation
8. **Vue 3 Reactivity**: Seamless real-time state updates

### **Accessibility Considerations**
```vue
<template>
  <div class="accessible-order-form">
    <!-- High contrast design -->
    <h1
      id="order-title"
      class="high-contrast-title"
    >
      New Order Entry
    </h1>

    <!-- Large touch targets (minimum 44px) -->
    <button
      class="large-touch-target"
      :aria-pressed="isSelected"
      @click="selectItem"
    >
      20kg Tank
    </button>

    <!-- Keyboard navigation support -->
    <div
      role="tabpanel"
      :tabindex="0"
      @keydown.enter="selectCurrentItem"
      @keydown.space.prevent="selectCurrentItem"
      @keydown.arrow-right="nextItem"
      @keydown.arrow-left="prevItem"
    >
      <span class="sr-only">Use arrow keys to navigate, Enter or Space to select</span>
    </div>

    <!-- Screen reader support -->
    <div
      :aria-live="'polite'"
      :aria-atomic="true"
      class="sr-only"
    >
      {{ orderSummary }}
    </div>

    <!-- Voice input alternative -->
    <button
      :aria-label="isListening ? 'Stop voice input' : 'Start voice input'"
      @click="toggleVoiceInput"
    >
      🎤 Voice Input
    </button>
  </div>
</template>

<style scoped>
.high-contrast-title {
  color: #000;
  background: #fff;
  border: 2px solid #000;
}

.large-touch-target {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
  margin: 4px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
```

- **High Contrast**: Clear visual hierarchy with border outlines
- **Large Touch Targets**: Minimum 44px for mobile interaction
- **Keyboard Navigation**: Full keyboard accessibility with arrow keys
- **Screen Reader Support**: Proper ARIA labels and live regions
- **Voice Commands**: Web Speech API alternative input method
- **Focus Management**: Clear focus indicators and logical tab order

## 🔄 Success Criteria

### **User Experience Success**
- Operators can complete order entry while maintaining conversation
- New operators require < 5 minutes training
- Customer satisfaction maintained or improved
- Operator stress levels reduced during peak hours

### **Business Success**
- 3x increase in call handling capacity
- 50% reduction in order entry errors
- 80% reduction in order entry time
- 95% operator adoption rate within 1 week

### **Technical Success**
- 99.9% uptime during business hours
- < 2 second response times for all operations
- Zero data loss during entry process
- Seamless integration with existing order workflow

## 📋 Future Phase Considerations

Phase 1 creates **PENDING** orders that will be processed in subsequent phases:

- **Phase 2**: Batch processing dashboard for PENDING → CONFIRMED
- **Phase 3**: Inventory reservation and delivery coordination
- **Phase 4**: Real-time delivery tracking and customer notifications
- **Phase 5**: Automated workflow integration (n8n)

This document serves as the foundation for Phase 1 implementation and will be updated as the design evolves through testing and user feedback.