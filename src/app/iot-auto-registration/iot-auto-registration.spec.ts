import { TestBed } from '@angular/core/testing';
import { IotAutoRegistration } from '../iot-auto-registration';

describe('IotAutoRegistration', () => {
    let service: IotAutoRegistration;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(IotAutoRegistration);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
