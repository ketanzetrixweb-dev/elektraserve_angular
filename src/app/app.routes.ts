import { Routes } from '@angular/router';
import { IotAutoRegistrationComponent } from './iot-auto-registration/iot-auto-registration';

export const routes: Routes = [
    { path: '', component: IotAutoRegistrationComponent },
    { path: 'registration', component: IotAutoRegistrationComponent },
    { path: '**', redirectTo: '' }
];
