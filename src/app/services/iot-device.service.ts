import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface DeviceItem {
    Id: number;
    DeviceIdentifier: string;
    DeviceName: string;
    SolutionType: 'Solar' | 'Pump' | 'AC' | 'Compressor' | 'LTDB' | 'Other' | string;
    RegistrationStatus: 'Pending' | 'Registered' | 'Error' | string;
    DeviceStatus: 'Online' | 'Offline' | string;
    LastSeenUtc: string | null;
    RegistrationError?: string | null;
    CreatedAtUtc?: string;
    UpdatedAtUtc?: string;
}

export interface DashboardSummary {
    total: number;
    pending: number;
    registered: number;
    error: number;
    online: number;
    offline: number;
}

export interface SummaryResponse {
    status: string;
    data: DashboardSummary;
}

export interface PaginatedDevicesResponse {
    devices: DeviceItem[];
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
}

@Injectable({
    providedIn: 'root'
})
export class IotDeviceService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = 'http://localhost:5000/api';

    getSummary(): Observable<SummaryResponse> {
        return this.http.get<SummaryResponse>(`${this.baseUrl}/dashboard/summary`);
    }

    getDevices(filter?: {
        search?: string;
        registrationStatus?: string;
        deviceStatus?: string;
        solutionType?: string;
        page?: number;
        limit?: number;
        offset?: number;
        sort?: string;
        order?: string;
    }): Observable<PaginatedDevicesResponse> {
        let params = new HttpParams();
        if (filter?.search) {
            params = params.set('search', filter.search.trim());
        }
        if (filter?.registrationStatus && filter.registrationStatus !== 'All') {
            params = params.set('registrationStatus', filter.registrationStatus);
        }
        if (filter?.deviceStatus && filter.deviceStatus !== 'All') {
            params = params.set('deviceStatus', filter.deviceStatus);
        }
        if (filter?.solutionType && filter.solutionType !== 'All') {
            params = params.set('solutionType', filter.solutionType);
        }
        if (filter?.page) {
            params = params.set('page', filter.page.toString());
        }
        if (filter?.limit) {
            params = params.set('limit', filter.limit.toString());
        }
        if (filter?.offset !== undefined) {
            params = params.set('offset', filter.offset.toString());
        }
        if (filter?.sort) {
            params = params.set('sort', filter.sort);
        }
        if (filter?.order) {
            params = params.set('order', filter.order);
        }

        return this.http.get<DeviceItem[]>(`${this.baseUrl}/devices`, { params, observe: 'response' }).pipe(
            map(res => {
                const devices = res.body || [];
                const total = parseInt(res.headers.get('x-total-count') || `${devices.length}`, 10);
                const totalPages = parseInt(res.headers.get('x-total-pages') || '1', 10);
                const currentPage = parseInt(res.headers.get('x-current-page') || '1', 10);
                const limit = parseInt(res.headers.get('x-page-size') || `${devices.length}`, 10);
                return {
                    devices,
                    total: isNaN(total) ? devices.length : total,
                    totalPages: isNaN(totalPages) ? 1 : totalPages,
                    currentPage: isNaN(currentPage) ? 1 : currentPage,
                    limit: isNaN(limit) ? 10 : limit
                };
            })
        );
    }

    getDeviceById(id: number): Observable<DeviceItem> {
        return this.http.get<DeviceItem>(`${this.baseUrl}/devices/${id}`);
    }

    createDevice(device: {
        DeviceIdentifier: string;
        DeviceName: string;
        SolutionType: string;
    }): Observable<DeviceItem> {
        return this.http.post<DeviceItem>(`${this.baseUrl}/devices`, device);
    }

    updateDevice(id: number, device: {
        DeviceIdentifier?: string;
        DeviceName?: string;
        SolutionType?: string;
        RegistrationStatus?: string;
        DeviceStatus?: string;
    }): Observable<DeviceItem> {
        return this.http.put<DeviceItem>(`${this.baseUrl}/devices/${id}`, device);
    }

    deleteDevice(id: number): Observable<{ status: string; message: string }> {
        return this.http.delete<{ status: string; message: string }>(`${this.baseUrl}/devices/${id}`);
    }

    registerDevice(id: number): Observable<{ status?: string; message?: string; data?: DeviceItem }> {
        return this.http.post<any>(`${this.baseUrl}/devices/${id}/register`, {});
    }

    retryRegistration(id: number): Observable<{ status?: string; message?: string; data?: DeviceItem }> {
        return this.http.post<any>(`${this.baseUrl}/devices/${id}/retry-registration`, {});
    }

    simulateOnline(id: number): Observable<{ status?: string; message?: string; data?: DeviceItem }> {
        return this.http.post<any>(`${this.baseUrl}/devices/${id}/simulate-online`, {});
    }

    simulateOffline(id: number): Observable<{ status?: string; message?: string; data?: DeviceItem }> {
        return this.http.post<any>(`${this.baseUrl}/devices/${id}/simulate-offline`, {});
    }
}
