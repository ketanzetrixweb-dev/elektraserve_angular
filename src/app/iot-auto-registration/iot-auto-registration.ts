import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IotDeviceService, DeviceItem, DashboardSummary } from '../services/iot-device.service';

@Component({
    selector: 'app-iot-auto-registration',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './iot-auto-registration.html',
    styleUrl: './iot-auto-registration.scss'
})
export class IotAutoRegistrationComponent implements OnInit {
    private readonly deviceService = inject(IotDeviceService);

    // Data signals / state
    summary = signal<DashboardSummary>({
        total: 0,
        pending: 0,
        registered: 0,
        error: 0,
        online: 0,
        offline: 0
    });

    devices = signal<DeviceItem[]>([]);
    isLoading = signal<boolean>(false);
    actionLoading = signal<boolean>(false);

    // Pagination state
    currentPage = signal<number>(1);
    pageSize = signal<number>(10);
    totalDevicesCount = signal<number>(0);
    totalPages = signal<number>(1);
    readonly pageSizeOptions = [5, 10, 25, 50];

    // Sorting state (default: Id DESC)
    sortColumn = signal<string>('Id');
    sortOrder = signal<'ASC' | 'DESC'>('DESC');

    startItemIndex = computed(() => {
        if (this.totalDevicesCount() === 0) return 0;
        return (this.currentPage() - 1) * this.pageSize() + 1;
    });

    endItemIndex = computed(() => {
        const end = this.currentPage() * this.pageSize();
        return Math.min(end, this.totalDevicesCount());
    });

    pagesList = computed(() => {
        const pages: number[] = [];
        for (let i = 1; i <= this.totalPages(); i++) {
            pages.push(i);
        }
        return pages;
    });

    // Notification Toast State
    successMessage = signal<string | null>(null);
    errorMessage = signal<string | null>(null);
    private toastTimer: any = null;

    showSuccessToast(message: string): void {
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.errorMessage.set(null);
        this.successMessage.set(message);
        this.toastTimer = setTimeout(() => {
            this.successMessage.set(null);
        }, 4000);
    }

    showErrorToast(message: string): void {
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.successMessage.set(null);
        this.errorMessage.set(message);
        this.toastTimer = setTimeout(() => {
            this.errorMessage.set(null);
        }, 5000);
    }

    clearNotification(): void {
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.successMessage.set(null);
        this.errorMessage.set(null);
    }

    // Filters
    searchTerm = '';
    selectedRegistration = 'All';
    selectedDeviceStatus = 'All';
    selectedSolution = 'All';

    readonly solutionOptions = ['All', 'Solar', 'Pump', 'AC', 'Compressor', 'LTDB', 'Other'];
    readonly registrationOptions = ['All', 'Pending', 'Registered', 'Error'];
    readonly statusOptions = ['All', 'Online', 'Offline'];

    // Modal Controls
    showAddModal = false;
    showEditModal = false;
    showViewModal = false;
    showDeleteConfirmModal = false;

    selectedDevice: DeviceItem | null = null;
    deviceToDelete: DeviceItem | null = null;

    // Form Models
    addForm = {
        DeviceIdentifier: '',
        DeviceName: '',
        SolutionType: ''
    };

    editForm = {
        Id: 0,
        DeviceIdentifier: '',
        DeviceName: '',
        SolutionType: 'Solar',
        RegistrationStatus: 'Pending',
        DeviceStatus: 'Offline'
    };

    ngOnInit(): void {
        this.refreshAll();
    }

    refreshAll(): void {
        this.fetchSummary();
        this.fetchDevices();
    }

    fetchSummary(): void {
        this.deviceService.getSummary().subscribe({
            next: (res) => {
                if (res?.data) {
                    this.summary.set(res.data);
                }
            },
            error: (err) => {
                console.error('Failed to load summary:', err);
            }
        });
    }

    fetchDevices(): void {
        this.isLoading.set(true);
        this.deviceService.getDevices({
            search: this.searchTerm,
            registrationStatus: this.selectedRegistration,
            deviceStatus: this.selectedDeviceStatus,
            solutionType: this.selectedSolution,
            page: this.currentPage(),
            limit: this.pageSize(),
            sort: this.sortColumn(),
            order: this.sortOrder()
        }).subscribe({
            next: (res) => {
                this.devices.set(res.devices || []);
                const isFiltered = !!this.searchTerm.trim() || this.selectedRegistration !== 'All' || this.selectedDeviceStatus !== 'All' || this.selectedSolution !== 'All';
                const effectiveTotal = (!isFiltered && this.summary().total > res.total) ? this.summary().total : res.total;
                this.totalDevicesCount.set(effectiveTotal);
                this.totalPages.set(Math.max(1, Math.ceil(effectiveTotal / this.pageSize())));
                this.currentPage.set(res.currentPage);
                this.isLoading.set(false);
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Failed to fetch devices from server.');
                this.isLoading.set(false);
            }
        });
    }

    onFilterChanged(): void {
        this.currentPage.set(1);
        this.fetchDevices();
    }

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
            return;
        }
        this.currentPage.set(page);
        this.fetchDevices();
    }

    previousPage(): void {
        if (this.currentPage() > 1) {
            this.goToPage(this.currentPage() - 1);
        }
    }

    nextPage(): void {
        if (this.currentPage() < this.totalPages()) {
            this.goToPage(this.currentPage() + 1);
        }
    }

    onPageSizeChange(newSize: number): void {
        this.pageSize.set(Number(newSize));
        this.currentPage.set(1);
        this.fetchDevices();
    }

    toggleSort(column: string): void {
        if (this.sortColumn() === column) {
            this.sortOrder.set(this.sortOrder() === 'ASC' ? 'DESC' : 'ASC');
        } else {
            this.sortColumn.set(column);
            this.sortOrder.set('DESC');
        }
        this.currentPage.set(1);
        this.fetchDevices();
    }

    // Action: Register Device
    registerDevice(device: DeviceItem): void {
        this.clearNotification();
        this.actionLoading.set(true);
        this.deviceService.registerDevice(device.Id).subscribe({
            next: (res) => {
                this.actionLoading.set(false);
                this.showSuccessToast(`Device "${device.DeviceName}" registered successfully.`);
                this.refreshAll();
            },
            error: (err) => {
                this.actionLoading.set(false);
                this.showErrorToast(err.error?.message || `Failed to register "${device.DeviceName}".`);
            }
        });
    }

    // Action: Retry Registration
    retryRegistration(device: DeviceItem): void {
        this.clearNotification();
        this.actionLoading.set(true);
        this.deviceService.retryRegistration(device.Id).subscribe({
            next: (res) => {
                this.actionLoading.set(false);
                this.showSuccessToast(`Registration retry initiated for "${device.DeviceName}". Status set to Pending.`);
                this.refreshAll();
            },
            error: (err) => {
                this.actionLoading.set(false);
                this.showErrorToast(err.error?.message || `Failed to retry registration for "${device.DeviceName}".`);
            }
        });
    }

    // Action: Simulate Online
    simulateOnline(device: DeviceItem): void {
        this.clearNotification();
        this.deviceService.simulateOnline(device.Id).subscribe({
            next: () => {
                this.showSuccessToast(`Device "${device.DeviceName}" status updated to Online.`);
                this.refreshAll();
            },
            error: (err) => {
                this.showErrorToast(err.error?.message || 'Simulation failed.');
            }
        });
    }

    // Action: Simulate Offline
    simulateOffline(device: DeviceItem): void {
        this.clearNotification();
        this.deviceService.simulateOffline(device.Id).subscribe({
            next: () => {
                this.showSuccessToast(`Device "${device.DeviceName}" status updated to Offline.`);
                this.refreshAll();
            },
            error: (err) => {
                this.showErrorToast(err.error?.message || 'Simulation failed.');
            }
        });
    }

    // Action: Open Delete Confirmation Modal
    openDeleteConfirmModal(device: DeviceItem): void {
        this.clearNotification();
        this.deviceToDelete = device;
        this.showDeleteConfirmModal = true;
    }

    closeDeleteConfirmModal(): void {
        this.showDeleteConfirmModal = false;
        this.deviceToDelete = null;
    }

    // Action: Confirm Delete Device
    confirmDelete(): void {
        if (!this.deviceToDelete) return;

        const device = this.deviceToDelete;
        this.clearNotification();
        this.actionLoading.set(true);

        this.deviceService.deleteDevice(device.Id).subscribe({
            next: () => {
                this.actionLoading.set(false);
                this.closeDeleteConfirmModal();
                this.showSuccessToast(`Device "${device.DeviceName}" (${device.DeviceIdentifier}) deleted successfully.`);
                this.refreshAll();
            },
            error: (err) => {
                this.actionLoading.set(false);
                this.showErrorToast(err.error?.message || `Failed to delete device "${device.DeviceName}".`);
            }
        });
    }

    // Modal: Add Device
    openAddModal(): void {
        this.clearNotification();
        this.addForm = {
            DeviceIdentifier: `DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
            DeviceName: '',
            SolutionType: ''
        };
        this.showAddModal = true;
    }

    closeAddModal(): void {
        this.showAddModal = false;
    }

    submitAddDevice(): void {
        if (!this.addForm.DeviceIdentifier.trim() || !this.addForm.DeviceName.trim() || !this.addForm.SolutionType.trim()) {
            this.showErrorToast('Device Identifier, Device Name, and Solution Type are required.');
            return;
        }

        this.actionLoading.set(true);
        this.deviceService.createDevice({
            DeviceIdentifier: this.addForm.DeviceIdentifier.trim(),
            DeviceName: this.addForm.DeviceName.trim(),
            SolutionType: this.addForm.SolutionType.trim()
        }).subscribe({
            next: (created) => {
                this.actionLoading.set(false);
                this.closeAddModal();
                this.showSuccessToast(`Device "${created.DeviceName}" (${created.DeviceIdentifier}) added successfully.`);
                this.refreshAll();
            },
            error: (err) => {
                this.actionLoading.set(false);
                this.showErrorToast(err.error?.message || 'Failed to add device.');
            }
        });
    }

    // Modal: Edit Device
    openEditModal(device: DeviceItem): void {
        this.clearNotification();
        this.editForm = {
            Id: device.Id,
            DeviceIdentifier: device.DeviceIdentifier,
            DeviceName: device.DeviceName,
            SolutionType: device.SolutionType,
            RegistrationStatus: device.RegistrationStatus,
            DeviceStatus: device.DeviceStatus
        };
        this.showEditModal = true;
    }

    closeEditModal(): void {
        this.showEditModal = false;
    }

    submitEditDevice(): void {
        if (!this.editForm.DeviceName.trim() || !this.editForm.SolutionType.trim()) {
            this.showErrorToast('Device Name and Solution Type cannot be blank.');
            return;
        }

        this.actionLoading.set(true);
        this.deviceService.updateDevice(this.editForm.Id, {
            DeviceIdentifier: this.editForm.DeviceIdentifier.trim(),
            DeviceName: this.editForm.DeviceName.trim(),
            SolutionType: this.editForm.SolutionType.trim(),
            RegistrationStatus: this.editForm.RegistrationStatus,
            DeviceStatus: this.editForm.DeviceStatus
        }).subscribe({
            next: (updated) => {
                this.actionLoading.set(false);
                this.closeEditModal();
                this.showSuccessToast(`Device "${updated.DeviceName}" updated successfully.`);
                this.refreshAll();
            },
            error: (err) => {
                this.actionLoading.set(false);
                this.showErrorToast(err.error?.message || 'Failed to update device.');
            }
        });
    }

    // Modal: View Device
    openViewModal(device: DeviceItem): void {
        this.selectedDevice = device;
        this.showViewModal = true;
    }

    closeViewModal(): void {
        this.showViewModal = false;
        this.selectedDevice = null;
    }

    // Helpers
    formatLastSeen(dateStr: string | null | undefined): string {
        if (!dateStr) {
            return 'Never';
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            return 'Never';
        }

        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        if (isToday) {
            return `Today ${hours}:${minutes}`;
        }
        if (isYesterday) {
            return 'Yesterday';
        }

        return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${hours}:${minutes}`;
    }
}
