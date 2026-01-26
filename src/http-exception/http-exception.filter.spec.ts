import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, ArgumentsHost, HttpStatus } from '@nestjs/common';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: any;
  let mockResponse: MockResponse;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockArgumentsHost = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn().mockReturnValue({ url: '/test-url' }),
    };
  });

  it('should format the error response correctly', () => {
    const status = HttpStatus.BAD_REQUEST;
    const exception = new HttpException('Validation Failed', status);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(status);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: status,
        path: '/test-url',
        message: 'Validation Failed',
      }),
    );
  });
});
