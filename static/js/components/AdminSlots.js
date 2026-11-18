// static/js/components/AdminSlots.js
// Admin global examination slots management and exceptional examiner reassignment.

const AdminSlots = {
    props: ["searchQuery"],
    data() {
        return {
            slots: [],
            examiners: [],
            selectedSlot: null,
            newExaminerId: "",
            loading: false,
            errorMessage: "",
            successMessage: ""
        };
    },
    computed: {
        filteredSlots() {
            if (!this.searchQuery) return this.slots;
            const q = this.searchQuery.toLowerCase();
            return this.slots.filter(s => 
                (s.exam_name && s.exam_name.toLowerCase().includes(q)) || 
                (s.examiner_name && s.examiner_name.toLowerCase().includes(q)) ||
                s.date.includes(q)
            );
        }
    },
    mounted() {
        this.fetchSlots();
        this.fetchExaminers();
    },
    methods: {
        async fetchSlots() {
            this.loading = true;
            try {
                this.slots = await window.API.get("/api/admin/slots");
            } catch (err) {
                this.errorMessage = err.message || "Failed to load slots";
            } finally {
                this.loading = false;
            }
        },
        async fetchExaminers() {
            try {
                this.examiners = await window.API.get("/api/admin/examiners");
            } catch (err) {}
        },
        openReassign(slot) {
            this.selectedSlot = slot;
            this.newExaminerId = slot.examiner_id;
            this.errorMessage = "";
            this.successMessage = "";
        },
        async reassignExaminer() {
            if (!this.newExaminerId) return;
            try {
                const res = await window.API.put(`/api/admin/slots/${this.selectedSlot.id}/examiner`, {
                    examiner_id: this.newExaminerId
                });
                this.successMessage = res.message || "Slot examiner updated";
                this.selectedSlot = null;
                this.fetchSlots();
            } catch (err) {
                this.errorMessage = err.message || "Failed to reassign examiner";
            }
        }
    },
    template: `
    <div>
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-0">Examination Slots Overview</h3>
                <p class="text-muted small">Global schedule of all slots with exceptional examiner reassignment</p>
            </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger py-2 small">{{ errorMessage }}</div>
        <div v-if="successMessage" class="alert alert-success py-2 small">{{ successMessage }}</div>

        <!-- Inline Reassign Form -->
        <div class="card mb-4 border-warning" v-if="selectedSlot">
            <div class="card-header bg-light d-flex justify-content-between align-items-center">
                <strong>Reassign Examiner for Slot #{{ selectedSlot.id }} ({{ selectedSlot.exam_name }} &bull; {{ selectedSlot.date }})</strong>
                <button class="btn btn-sm btn-outline-secondary" @click="selectedSlot = null">Cancel</button>
            </div>
            <div class="card-body">
                <div class="row g-2 align-items-end">
                    <div class="col-md-8">
                        <label class="form-label small">Select Replacement Examiner</label>
                        <select class="form-select form-select-sm" v-model="newExaminerId">
                            <option v-for="ex in examiners" :key="ex.id" :value="ex.id">{{ ex.full_name }} ({{ ex.email }})</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <button class="btn btn-sm btn-warning w-100" @click="reassignExaminer">Confirm Reassignment</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Slot ID</th>
                            <th>Examination</th>
                            <th>Assigned Examiner</th>
                            <th>Date</th>
                            <th>Time Window</th>
                            <th>Seats Left</th>
                            <th>Status</th>
                            <th class="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="loading"><td colspan="8" class="text-center py-4 text-muted">Loading slots...</td></tr>
                        <tr v-else-if="filteredSlots.length === 0"><td colspan="8" class="text-center py-4 text-muted">No slots created yet</td></tr>
                        <tr v-for="s in filteredSlots" :key="s.id">
                            <td>#{{ s.id }}</td>
                            <td class="fw-bold">{{ s.exam_name }}</td>
                            <td>{{ s.examiner_name }}</td>
                            <td>{{ s.date }}</td>
                            <td>{{ s.start_time }} - {{ s.end_time }}</td>
                            <td>
                                <span class="badge" :class="s.available_seats > 0 ? 'bg-primary' : 'bg-secondary'">
                                    {{ s.available_seats }} of {{ s.capacity }}
                                </span>
                            </td>
                            <td>
                                <span class="badge" :class="{
                                    'bg-success': s.status === 'Available',
                                    'bg-danger': s.status === 'Full',
                                    'bg-secondary': s.status === 'Cancelled',
                                    'bg-info': s.status === 'Completed'
                                }">{{ s.status }}</span>
                            </td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-warning" @click="openReassign(s)">Change Examiner</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `
};

window.AdminSlots = AdminSlots;
