import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TranslatorService } from 'src/services/translator.service';
import { AuthService } from 'src/services/auth.service';
import { first } from 'rxjs';
import * as _ from 'lodash';
import { environment } from 'src/environments/environment';
import { AdminService } from 'src/modules/admin/services/admin.service';

@Component({
  selector: 'app-request-info',
  templateUrl: './request-info.component.html',
  styleUrls: ['./request-info.component.scss'],
})
export class RequestInfoComponent {
  requestId = -1;
  requestBasicInfo: any = {};
  requestDetail: any = {};
  requestWorkflow: any;
  applicationLang = 'en';
  currentUser: any;
  selectedEmployee: any;
  showTeamMembers = false;
  teamMembers: any[] = [];
  selectedRole = '';
  showActionBtns = false;
  empBtnText = '';
  employeeSelectedFor = '';
  showRequestHistory = false;
  requestHistory: any[] = [];
  workflowUsers: any[] = [];
  showDelegateModal = false;
  delegateInfoDialog = false;
  reqInfoDialog = false;
  requestLoaded = false;
  askRejectReason = false;
  rejectReason = '';
  submitted = false;
  requestInformation = '';
  showRejectSpinner = false;
  showApproveSpinner = false;
  askRequestAnswer = false;
  reqAnswer = '';
  askApprovalNotes = false;
  showNotesDialog = false;
  notesToDisplay = '';
  approvalNotes = '';
  showModalValidation: Boolean = false;
  modalValidationMsg: string = '';
  fileUploadSpinner = false;
  invoiceAttachments: string[] = [];
  poItemsAttachments: string[] = [];
  answerAttachments: string[] = [];
  poNumber: string = '';
  invoiceNumber: string = '';
  //invoiceDate: Date | undefined;
  invoiceCurrency: number = 0;
  invoiceAmount: number = 0;
  showfileUploadValidation = false;
  showPONumberValidation = false;
  showInvoiceNumberValidation = false;
  //showInvoiceDateValidation = false;
  showInvoiceAmountValidation = false;
  delegateInformation = '';
  employeeName = '';
  updatedGroupName: string = '';
  serviceSteps: any[] = [];
  currencies: any[] = [];
  requestJson: any;
  vidaTrafJson: any;
  spinner = false;
  loadRequestDetail = false;
  domain = environment.base_api;

  @ViewChild('adExchangeComp') adExchangeFormComponent: any;
  @ViewChild('adInterComp') adInternetFormComponent: any;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private messageService: MessageService,
    private adminService: AdminService,
    private router: Router,
    private translateService: TranslatorService,
    private authService: AuthService,
    private confirmationService: ConfirmationService
  ) {
    this.currentUser = this.authService.getCurrentUser();
    this.translateService.getCurrentLanguage().subscribe((lng: string) => {
      this.applicationLang = lng;
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((param: any) => {
      if (param.id) {
        this.getRequestDetails(param.id); // id is reference no here
        this.getRequestWorkflow(param.id); // id is reference no here
      } else {
        this.router.navigate(['/user/dashboard']);
      }
    });
  }

  getCurrencies() {
    this.userService
      .getLookupData('Currency')
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.currencies = resp.data;
            let currency = this.currencies.find((x) => x.nameEn == 'SAR');
            setTimeout(() => {
              this.invoiceCurrency = currency.id;
            }, 10);
          }
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  getRequestDetails(referenceNumber: string): void {
    this.userService
      .getRequestDetail(referenceNumber)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.employeeName = resp.data?.employeeName;
            this.requestBasicInfo = resp.data;
            if (
              this.requestBasicInfo.serviceId == 8 &&
              !this.requestBasicInfo.isNewRequest
            ) {
              //old vida
              this.router.navigate(['/user/vida-request-detail'], {
                queryParams: { id: referenceNumber },
              });
            } else if (
              this.requestBasicInfo.serviceId == 36 &&
              !this.requestBasicInfo.isNewRequest
            ) {
              //old traf
              this.router.navigate(['/user/traf-request-detail'], {
                queryParams: { id: referenceNumber },
              });
            } else if (!this.requestBasicInfo.isNewRequest) {
              //old dynamic request
              this.router.navigate(['/user/request-detail'], {
                queryParams: { id: referenceNumber },
              });
            }
            this.getActionButtons(referenceNumber); // id is reference no here
            this.requestId = this.requestBasicInfo.id;
            this.requestJson = JSON.parse(this.requestBasicInfo?.requestDetail);
            this.vidaTrafJson = JSON.parse(
              this.requestBasicInfo?.requestDetail
            );

            this.getServiceFormFields();
            this.getRequestAttachments();
            this.getRequestHistory();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  getRequestAttachments(): void {
    this.userService
      .getRequestAttachments(this.requestId)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.requestDetail['attachments'] = resp.data;
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  getServiceFormFields(): void {
    this.spinner = true;
    this.userService
      .getServiceFormForRequest(this.requestBasicInfo.serviceId)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.serviceSteps = resp.data.serviceSteps;
            this.updateRequestDetailMappings();
            this.spinner = false;
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
            this.spinner = false;
          }
        },
        error: (err: any) => {
          this.spinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  updateRequestDetailMappings(): void {
    if (!this.requestJson) {
      // this.messageService.add({ severity: 'error', summary: 'Request Detail is missing', detail: '' });
      this.spinner = false;
      return;
    }
    this.requestJson = this.convertKeysToLowerCase(this.requestJson);
    this.requestDetail['user'] = [];
    this.requestDetail['request'] = [];

    //  Step 0  is for employee information
    this.serviceSteps.forEach((step, index) => {
      if (index === 0) {
        // Mapping for step 0 and employee information, as first step for dynamic services is always emp info
        step.stepFields.forEach((field: any) => {
          const mappedField = {
            key: field.key.toLowerCase(),
            value: this.requestJson[field.key.toLowerCase()] || '', // Assign the value from JSON if it exists, otherwise assign an empty string
            labelEn: field.labelEn,
            labelAr: field.labelAr,
            controlType: field.controlType,
          };
          this.requestDetail.user.push(mappedField);
        });
      } else {
        step.stepFields.forEach((field: any) => {
          const mappedField = {
            key: field.key.toLowerCase(),
            value: this.requestJson[field.key.toLowerCase()] || '', // Assign the value from JSON if it exists, otherwise assign an empty string
            labelEn: field.labelEn,
            labelAr: field.labelAr,
            controlType: field.controlType,
          };

          if (
            this.requestBasicInfo.serviceId == 34 &&
            field.key == 'users' &&
            this.requestJson['newusers']
          ) {
            //add remove users to group
            mappedField['value'] = this.requestJson['newusers'];
          } else if (
            this.requestBasicInfo.serviceId == 34 &&
            field.key.toLowerCase() == 'group'
          ) {
            //dynamic report
            mappedField['value'] = this.requestJson['groupname'];
          }

          if (
            field.controlType == 'dropdown' ||
            field.controlType == 'checkbox' ||
            field.controlType == 'radiobutton'
          ) {
            let textValue = field.options?.find(
              (x: any) => x.id == mappedField.value
            )?.nameEn;
            if (textValue) {
              mappedField['value'] = textValue;
            }
          }

          if (
            this.requestBasicInfo.serviceId == 17 &&
            field.key.toLowerCase() == 'category'
          ) {
            //dynamic report
            mappedField['value'] = this.requestJson['categoryname'];
          } else if (
            this.requestBasicInfo.serviceId == 17 &&
            field.key.toLowerCase() == 'report'
          ) {
            //dynamic report
            mappedField['value'] = this.requestJson['reportname'];
          }

          if (field.controlType == 'date') {
            mappedField['value'] = new Date(
              mappedField['value']
            ).toDateString();
          } else if (field.controlType == 'month') {
            mappedField['value'] =
              (new Date(mappedField.value).getMonth() + 1).toString() +
              '/' +
              new Date(mappedField.value).getFullYear().toString();
          }

          if (
            field.controlType == 'dropdown' &&
            field.searchApi &&
            field.searchApi.requestType.toLowerCase() == 'get'
          ) {
            this.userService
              .callDynamicApi(field.searchApi)
              .pipe(first())
              .subscribe({
                next: (resp: any) => {
                  if (resp.isSuccessful) {
                    //for AD group ,, group name is also coming in requestJson, alternate solution to avoid extra API
                    field.options = resp.data;
                    let textValue = field.options?.find(
                      (x: any) =>
                        x.id == this.requestJson[field.key.toLowerCase()]
                    )?.nameEn;
                    if (textValue) {
                      this.requestDetail.request.find(
                        (x: any) => x.key == field.key.toLowerCase()
                      ).value = textValue;
                    }
                  }
                },
                error: () => {
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Something went wrong',
                    detail: '',
                  });
                },
              });
          }
          this.requestDetail.request.push(mappedField);
        });
      }
    });

    this.loadRequestDetail = true;
  }

  convertKeysToLowerCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj; // Return the original value if it's not an object
    }

    const newObj: any = Array.isArray(obj) ? [] : {}; // Create a new array or object

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = key.toLowerCase(); // Convert the key to lowercase
        newObj[newKey] = this.convertKeysToLowerCase(obj[key]); // Recursively convert nested objects
      }
    }

    return newObj;
  }

  getRequestWorkflow(referenceNumber: string): void {
    this.userService
      .getRequestWorkflow_new(referenceNumber)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.requestWorkflow = resp.data;
            this.getCurrencies();

            const lastApprovalLevel =
              this.requestWorkflow[this.requestWorkflow.length - 1]; //getting last stage on client side.. later get it from server
            if (
              lastApprovalLevel.isLastStep &&
              lastApprovalLevel.action == 'Pending'
            ) {
              this.requestBasicInfo['isLastStage'] = true;
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  getActionButtons(referenceNumber: string): void {
    this.userService
      .getRequestActionBtns(referenceNumber)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.requestBasicInfo['actions'] = resp.data; //action buttons loaded
            if (this.requestBasicInfo.actions.length) {
              this.showActionBtns = true;
            }
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  getPendingSinceTime(user: any, actionIndex: number): string {
    const previousUser = this.requestWorkflow[actionIndex - 1];
    if (
      previousUser &&
      previousUser?.action != 'Pending' &&
      user.action == 'Pending'
    ) {
      const maxDate = new Date(); //this user action time
      const previousActionTime = previousUser.date;
      const minDate = new Date(previousActionTime); //previous user action time
      return this.getTimeDifference(maxDate, minDate);
    }
    return '';
  }

  getTimeDifference(maxDate: Date, minDate: Date): string {
    const timeDifference =
      new Date(maxDate).getTime() - new Date(minDate).getTime();
    const milliSecondsInASecond = 1000,
      hoursInADay = 24,
      minutesInAnHour = 60,
      SecondsInAMinute = 60;

    const secs = Math.floor(
      (timeDifference / milliSecondsInASecond) % SecondsInAMinute
    );
    const mins = Math.floor(
      (timeDifference / (milliSecondsInASecond * minutesInAnHour)) %
        SecondsInAMinute
    );
    const hrs = Math.floor(
      (timeDifference /
        (milliSecondsInASecond * minutesInAnHour * SecondsInAMinute)) %
        hoursInADay
    );
    const days = Math.floor(
      timeDifference /
        (milliSecondsInASecond *
          minutesInAnHour *
          SecondsInAMinute *
          hoursInADay)
    );

    if (this.applicationLang == 'en') {
      if (days > 0) {
        return `${days} Days ${hrs} Hrs  ${mins} Mins ${secs} Secs`;
      } else if (days == 0 && hrs > 0) {
        return `${hrs} Hrs  ${mins} Mins ${secs} Secs`;
      } else {
        return `${mins} Mins ${secs} Secs`;
      }
    } else {
      if (days > 0) {
        return `${days} أيام ${hrs} ساعة  ${mins} دقائق ${secs} ثواني`;
      } else if (days == 0 && hrs > 0) {
        return `${hrs} ساعة  ${mins} دقائق ${secs} ثواني`;
      } else {
        return `${mins} دقائق ${secs} ثواني`;
      }
    }
  }

  getActionDuration(user: any, actionIndex: number): string {
    if (user.action == 'Submitted') {
      return '- - -';
    }
    if (
      user.action != 'Submitted' &&
      user.action != 'Pending' &&
      user.action != 'Waiting'
    ) {
      const maxDate = new Date(user.date); //this user action time
      const previousActionTime = this.requestWorkflow[actionIndex - 1]?.date;
      const minDate = new Date(previousActionTime); //previous user action time
      return this.getTimeDifference(maxDate, minDate);
    }
    return this.applicationLang == 'en'
      ? 'No action yet'
      : 'لا يوجد إجراء حتى الآن';
  }

  viewMembers(item: any) {
    if (item) {
      this.showTeamMembers = true;
      this.selectedRole =
        this.applicationLang == 'en' ? item.roleNameEn : item.roleNameAr;
      this.teamMembers = _.uniqBy(item.users, 'employeeNumber');
      let index = item.users.findIndex(
        (e: any) => e.employeeNumber == item.employeeNumber
      );
      if (this.teamMembers[index]) {
        this.teamMembers[index].action = item.action;
      }
    }
  }

  onHistorySideClose(ev: any): void {
    this.showRequestHistory = false;
  }

  copyText(text: string): void {
    setTimeout(async () => await navigator.clipboard.writeText(text), 1000);
    this.messageService.add({
      severity: 'success',
      summary:
        this.applicationLang == 'en'
          ? 'Text copied successfully.'
          : 'تم نسخ النص بنجاح`',
    });
  }

  openEmployeeSearchPopup(type: string): void {
    this.workflowUsers = this.requestWorkflow
      .filter((x: any) => x.users?.length == 1 || !x.users)
      .map((x: any) => ({
        profilePicture: '',
        fullName: x.userName,
        emailAddress: x.email,
        employeeNumber: x.employeeNumber,
      }));

    this.workflowUsers = _.uniqBy(this.workflowUsers, 'emailAddress');

    if (type == 'delegate') {
      this.empBtnText = 'Delegate';
      this.showDelegateModal = true;
      this.employeeSelectedFor = 'delegation';
    } else if (type == 'reqInfo') {
      this.empBtnText = 'Request Information';
      this.showDelegateModal = true;
      this.employeeSelectedFor = 'requestInformation';
    }
  }

  onEmployeeSearchClose(employee: any): void {
    if (employee && this.employeeSelectedFor == 'delegation') {
      //delegate
      this.selectedEmployee = employee;
      if (this.currentUser.employeeNumber == employee.employeeNumber) {
        this.messageService.add({
          severity: 'warn',
          summary:
            this.applicationLang == 'ar'
              ? 'لا يمكنك تفويض الطلب لنفسك.'
              : 'You can not delegate request to yourself.',
        });
      } else if (this.requestBasicInfo.requesterId == employee.employeeNumber) {
        // if you select requester/submitter for delegation
        this.messageService.add({
          severity: 'warn',
          summary:
            this.applicationLang == 'ar'
              ? 'لا يمكنك تفويض الطلب إلى الطالب.'
              : 'You can not delegate request to the requester.',
        });
      } else {
        this.selectedEmployee = employee;
        if (this.currentUser.employeeNumber == employee.employeeNumber) {
          this.messageService.add({
            severity: 'warn',
            summary:
              this.applicationLang == 'ar'
                ? 'لا يمكنك طلب معلومات من نفسك'
                : 'You can not request information from yourself.',
            detail: '',
          });
        } else {
          this.showDelegateModal = false;
          this.delegateInfoDialog = true;
        }
      }
    } else if (employee && this.employeeSelectedFor == 'requestInformation') {
      //request info
      this.selectedEmployee = employee;
      if (this.currentUser.employeeNumber == employee.employeeNumber) {
        this.messageService.add({
          severity: 'warn',
          summary:
            this.applicationLang == 'ar'
              ? 'لا يمكنك طلب معلومات من نفسك'
              : 'You can not request information from yourself.',
          detail: '',
        });
      } else {
        this.showDelegateModal = false;
        this.reqInfoDialog = true;
      }
    } else {
      this.showDelegateModal = false;
    }
  }

  onAnswerSubmit(): void {
    this.reqAnswer = this.reqAnswer.trim();
    if (!this.reqAnswer) {
      this.modalValidationMsg =
        this.applicationLang == 'ar'
          ? 'مطلوب إجابة الطلب.'
          : 'Request answer is required.';
      this.showModalValidation = true;
      // this.messageService.add({ severity: 'warn', summary: this.applicationLang == 'ar' ? 'مطلوب إجابة الطلب.' : 'Request answer is required.', detail: '' });
      return;
    }

    this.submitted = true;
    const reqInfoObj = {
      requestId: this.requestId,
      answerEn: this.reqAnswer,
      answerAr: this.reqAnswer,
      isAnswered: true,
    };
    this.userService
      .manageRequestInformation(reqInfoObj)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            this.messageService.add({
              severity: 'success',
              summary:
                this.applicationLang == 'ar'
                  ? 'تم تحديث الطلب بنجاح'
                  : 'Request updated successfully.',
              detail: '',
            });
            setTimeout(() => {
              this.router.navigate(['/user/myrequest'], {
                queryParams: { my_tasks: true },
              });
            }, 1000);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
          this.submitted = false;
        },
        (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong.',
            detail: '',
          });
          this.submitted = false;
        }
      );
  }

  onRequestReject(): void {
    this.rejectReason = this.rejectReason.trim();
    if (!this.rejectReason) {
      this.modalValidationMsg =
        this.applicationLang == 'ar'
          ? 'سبب الرفض مطلوب'
          : 'Reject reason is required.';
      this.showModalValidation = true;
      return;
    }

    let statusObj: any = {
      requestId: this.requestId,
      requestActionId: 2,
      reason: this.rejectReason,
    };
    this.updateRequestStatus(statusObj);
  }

  updateRequestStatus(statusObj: any): void {
    this.submitted = true;
    this.userService
      .updateRequestStatus(statusObj)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            this.messageService.add({
              severity: 'success',
              summary:
                this.applicationLang == 'ar'
                  ? 'تم تحديث الطلب بنجاح'
                  : 'Request updated successfully.',
              detail: '',
            });
            setTimeout(() => {
              this.router.navigate(['/user/myrequest'], {
                queryParams: {
                  my_tasks: statusObj.requestActionId == 16 ? false : true,
                },
              }); // 16 is for cancel request
            }, 1000);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
          this.submitted = false;
        },
        (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong.',
            detail: '',
          });
          this.submitted = false;
        }
      );
  }

  onApproveBtnClick(): void {
    if (
      this.requestBasicInfo.serviceId == 1 &&
      this.requestBasicInfo.isLastStage
    ) {
      this.adInternetFormComponent.submitted = true;
      if (this.adInternetFormComponent.internetADConfigForm.valid) {
        this.askApprovalNotes = true;
      } else {
        this.messageService.add({
          severity: 'error',
          summary:
            this.applicationLang == 'ar'
              ? 'Internet AD Group is required'
              : 'Internet AD Group is required',
        });
      }
    } else if (
      (this.requestBasicInfo.serviceId == 38 ||
        this.requestBasicInfo.serviceId == 2) &&
      this.requestBasicInfo.isLastStage
    ) {
      this.adExchangeFormComponent.submitted = true;
      if (this.adExchangeFormComponent.exchangeConfigForm.valid) {
        if (
          (this.requestBasicInfo.serviceId == 38 &&
            this.adExchangeFormComponent.usernameVerified) ||
          this.requestBasicInfo.serviceId == 2
        ) {
          this.askApprovalNotes = true;
        } else if (
          this.requestBasicInfo.serviceId == 38 &&
          !this.adExchangeFormComponent.usernameVerified
        ) {
          this.messageService.add({
            severity: 'error',
            summary:
              this.applicationLang == 'ar'
                ? 'لم يتم التحقق من اسم المستخدم، يرجى التحقق منه.'
                : 'Username is not verified, Please verify it.',
          });
        }
      }
    } else if (
      this.requestBasicInfo.serviceId == 51 &&
      this.isCurrentUserSNSAccountManager()
    ) {
      //timesheet request
      if (
        this.invoiceAttachments.length &&
        this.poNumber.trim() &&
        this.invoiceNumber.trim()
      ) {
        this.askApprovalNotes = true;
        this.showfileUploadValidation = false;
        this.showPONumberValidation = false;
        this.showInvoiceNumberValidation = false;
      }
      if (!this.invoiceAttachments.length) {
        this.showfileUploadValidation = true;
      }
      if (!this.invoiceNumber.trim()) {
        this.showInvoiceNumberValidation = true;
      }
      if (!this.invoiceAmount) {
        this.showInvoiceAmountValidation = true;
      }
      // if (!this.invoiceDate) {
      //   this.showInvoiceDateValidation = true;
      // }
      if (!this.poNumber.trim()) {
        this.showPONumberValidation = true;
      }
    } else {
      this.askApprovalNotes = true;
    }
  }

  isCurrentUserTimekeeper(): Boolean {
    let isTimeKeeper = false;

    const isCurrentUserInApprovalList = this.showActionById(3);
    const isCurrentUserTimeKeeper = this.requestWorkflow?.find(
      (x: any) =>
        x.employeeNumber == this.currentUser.employeeNumber &&
        x.erpRoleCode == 'ES_ITGFORMS_TimeKeeper_CS'
    );

    if (isCurrentUserInApprovalList && isCurrentUserTimeKeeper) {
      isTimeKeeper = true;
    }
    return isTimeKeeper;
  }

  isCurrentUserSNSAccountManager(): Boolean {
    let isSNSAccountManager = false;

    const isCurrentUserInApprovalList = this.showActionById(3);
    const isCurrentUserManager = this.requestWorkflow?.find(
      (x: any) =>
        x.employeeNumber == this.currentUser.employeeNumber &&
        x.erpRoleCode == 'SNS Account Manager'
    );

    if (isCurrentUserInApprovalList && isCurrentUserManager) {
      isSNSAccountManager = true;
    }
    return isSNSAccountManager;
  }

  onRequestInformation(): void {
    this.requestInformation = this.requestInformation.trim();
    if (!this.requestInformation) {
      this.modalValidationMsg =
        this.applicationLang == 'ar'
          ? 'معلومات الطلب حقل مطلوب'
          : 'Request information is required field.';
      this.showModalValidation = true;
      // this.messageService.add({ severity: 'warn', summary: this.applicationLang == 'ar' ? 'معلومات الطلب حقل مطلوب' : 'Request information is required field.', detail: '' });
      return;
    }

    this.submitted = true;
    const reqInfoObj = {
      requestId: this.requestId,
      questionEn: this.requestInformation,
      questionAr: this.requestInformation,
      questionTo: this.selectedEmployee.employeeNumber,
    };
    this.userService
      .manageRequestInformation(reqInfoObj)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            this.messageService.add({
              severity: 'success',
              summary:
                this.applicationLang == 'ar'
                  ? 'تم تحديث الطلب بنجاح'
                  : 'Request updated successfully.',
            });
            setTimeout(() => {
              this.router.navigate(['/user/myrequest'], {
                queryParams: { my_tasks: true },
              });
            }, 1000);
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
          this.submitted = false;
          this.showRejectSpinner = false;
          this.showApproveSpinner = false;
        },
        (err: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong.',
            detail: '',
          });
          this.submitted = false;
          this.showRejectSpinner = false;
          this.showApproveSpinner = false;
        }
      );
  }

  onDelegate(): void {
    this.delegateInformation = this.delegateInformation.trim();
    if (!this.delegateInformation) {
      this.modalValidationMsg =
        this.applicationLang == 'ar'
          ? 'معلومات الطلب حقل مطلوب'
          : 'Delegate information is required field.';
      this.showModalValidation = true;
      // this.messageService.add({ severity: 'warn', summary: this.applicationLang == 'ar' ? 'معلومات الطلب حقل مطلوب' : 'Request information is required field.', detail: '' });
      return;
    }

    this.submitted = true;
    let statusObj: any = {
      requestId: this.requestId,
      requestActionId: 1,
      delegateApprovalId: this.selectedEmployee.employeeNumber,
      reason: this.delegateInformation,
    };
    this.updateRequestStatus(statusObj);
  }

  onRequestApprove(): void {
    let statusObj: any = {
      requestId: this.requestId,
      requestActionId: 3,
      reason: this.approvalNotes.trim(),
    };
    if (
      this.requestBasicInfo.serviceId == 1 &&
      this.requestBasicInfo.isLastStage
    ) {
      let ADGroup: any =
        this.adInternetFormComponent.internetADConfigForm.value;
      statusObj['internetADGroup'] = ADGroup.internetADGroup;
    }
    if (
      this.requestBasicInfo.serviceId == 38 &&
      this.requestBasicInfo.isLastStage
    ) {
      //add new staff service
      let adUserData: any = {
        ...this.adExchangeFormComponent.exchangeConfigForm.value,
      };
      adUserData['emailType'] = this.requestDetail.request.find(
        (x: any) => x.key == 'emailtype'
      )?.value;
      adUserData['referenceNumber'] = this.requestBasicInfo?.referenceNumber;
      adUserData['memberGroups'] = adUserData.memberGroups.join(',');
      this.requestDetail?.user?.forEach((prop: any) => {
        adUserData['requester_' + prop.key] = prop.value;
      });
      statusObj['adUserData'] = JSON.stringify(adUserData);
      statusObj['isLastStep'] = true;
    } else if (
      this.requestBasicInfo.serviceId == 2 &&
      this.requestBasicInfo.isLastStage
    ) {
      //email service
      let adUserData: any =
        this.adExchangeFormComponent.exchangeConfigForm.value;
      adUserData['referenceNumber'] = this.requestBasicInfo?.referenceNumber;
      this.requestDetail?.user?.forEach((prop: any) => {
        adUserData['requester_' + prop.key] = prop.value;
      });
      statusObj['adUserData'] = JSON.stringify(adUserData);
      statusObj['isLastStep'] = true;
    } else if (
      this.requestBasicInfo.serviceId == 45 &&
      this.requestBasicInfo.isLastStage
    ) {
      //business card service
      statusObj['isBusinessCard​'] = true;
    } else if (
      this.requestBasicInfo.serviceId == 51 &&
      this.isCurrentUserSNSAccountManager()
    ) {
      //timesheet service
      statusObj['invoiceUrls'] = this.invoiceAttachments;
      statusObj['po'] = this.poItemsAttachments;
      statusObj['invoiceNumber'] = this.invoiceNumber;
      statusObj['currency'] = this.invoiceCurrency;
      statusObj['amount'] = this.invoiceAmount;
      statusObj['poNumber'] = this.poNumber;
      //statusObj['invoiceDate'] = this.invoiceDate;
    } else if (
      this.requestBasicInfo.serviceId == 11 &&
      this.requestBasicInfo.isLastStage &&
      this.updatedGroupName.trim()
    ) {
      //new email group
      statusObj['updatedGroupName'] = this.updatedGroupName; //if last approver updates email group name
    }
    this.showApproveSpinner = true;
    statusObj['isLastStep'] = this.requestBasicInfo.isLastStage;

    this.vidaTrafJson['approvalFormData'] = statusObj;
    statusObj['requestDetail'] = JSON.stringify(this.vidaTrafJson);
    this.updateRequestStatus(statusObj);
  }

  onGenerateQrCode(): void {
    const qRObj = {
      requestId: this.requestId,
      isRemovedDevice: false,
      isQRCodeGenerate: true,
      requestActionId: 3,
    };
    this.updateRequestStatus(qRObj);
  }

  onIncludeExcludeDoctor(): void {
    const qRObj = {
      requestId: this.requestId,
      serviceId: this.requestBasicInfo.serviceId,
      isLastStage: this.requestBasicInfo.isLastStage,
      requestActionId: 3, //approved
    };
    this.updateRequestStatus(qRObj);
  }

  onRemoveMohemmDevice(): void {
    const qRObj = {
      requestId: this.requestId,
      isRemovedDevice: true,
      isQRCodeGenerate: false,
      requestActionId: 3, //approved
    };
    this.updateRequestStatus(qRObj);
  }

  onDeleteFile(filePath: string, type: string): void {
    this.confirmationService.confirm({
      message: this.translateService.translate.instant('delete_msg'),
      accept: () => {
        this.userService
          .removeFile(filePath)
          .pipe(first())
          .subscribe({
            next: (resp: any) => {
              if (resp.isSuccessful) {
                if (type == 'invoice') {
                  const index = this.invoiceAttachments.indexOf(filePath);
                  if (index != -1) {
                    this.invoiceAttachments.splice(index, 1);
                    this.messageService.add({
                      severity: 'success',
                      summary:
                        this.translateService.translate.instant('file_rem_msg'),
                    });
                  } else {
                    this.messageService.add({
                      severity: 'error',
                      summary: resp.message,
                    });
                  }
                } else if (type == 'poItem') {
                  const index = this.poItemsAttachments.indexOf(filePath);
                  if (index != -1) {
                    this.poItemsAttachments.splice(index, 1);
                    this.messageService.add({
                      severity: 'success',
                      summary:
                        this.translateService.translate.instant('file_rem_msg'),
                    });
                  } else {
                    this.messageService.add({
                      severity: 'error',
                      summary: resp.message,
                    });
                  }
                } else if (type == 'answer') {
                  const index = this.answerAttachments.indexOf(filePath);
                  if (index != -1) {
                    this.answerAttachments.splice(index, 1);
                    this.messageService.add({
                      severity: 'success',
                      summary:
                        this.translateService.translate.instant('file_rem_msg'),
                    });
                  } else {
                    this.messageService.add({
                      severity: 'error',
                      summary: resp.message,
                    });
                  }
                }
              }
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: 'Something went wrong',
                detail: '',
              });
            },
          });
      },
    });
  }

  getSingleAttachmentInfo(attachmentUrl: any): string {
    let value = '';
    if (attachmentUrl) {
      //uploaded files
      let fileName = 'Attachment';
      let fileUrl = environment.base_api + attachmentUrl;
      const arr = attachmentUrl.split('_');
      fileName = arr[arr.length - 1]; //last word after _ in file path

      if (
        fileName?.toLowerCase().includes('.jpeg') ||
        fileName?.toLowerCase().includes('.jpg') ||
        fileName?.toLowerCase().includes('.png')
      ) {
        value += `<i class="pi pi-link"></i> <a href="${fileUrl}" target="_blank">${fileName}</a> &nbsp;&nbsp; <img src="${fileUrl}" alt="${fileName}" width="50px" /> `;
      } else {
        value += `<i class="pi pi-link"></i> <a href="${fileUrl}" target="_blank">${fileName}</a>`;
      }
    }
    return value;
  }

  onFileUpload(ev: any, type: string): void {
    this.fileUploadSpinner = true;
    this.userService
      .uploadInvoiceFiles(ev.files, this.requestId)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            if (type == 'invoice') {
              this.invoiceAttachments = [
                ...this.invoiceAttachments,
                ...resp.data,
              ];
            } else if (type == 'poItem') {
              this.poItemsAttachments = [
                ...this.poItemsAttachments,
                ...resp.data,
              ];
            } else if (type == 'answer') {
              this.answerAttachments = [
                ...this.answerAttachments,
                ...resp.data,
              ];
            }
            this.messageService.add({
              severity: 'success',
              summary: 'Files uploaded sucessfully',
              detail: '',
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.result.message,
              detail: '',
            });
          }
          this.fileUploadSpinner = false;
        },
        (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
          this.fileUploadSpinner = false;
        }
      );
  }

  getRequestFilesPath(files: any): string {
    let value = '';
    let fileName = 'Attachment';
    files.forEach((f: any) => {
      let fileUrl = environment.base_api + f.filePath;
      const arr = f.filePath.split('_');
      if (f.fileName) {
        fileName = f.fileName;
      } else {
        fileName = arr[arr.length - 1]; //last word after _ in file path
      }
      value += `<a href="${fileUrl}" target="_blank">${fileName}</a> <br>`;
    });
    return value; //list of files paths
  }

  getTimesheetFilesPath(filesList: any): string {
    let value = '';
    if (!filesList.length) {
      value = '- - -';
    }
    let fileName = 'Attachment';
    let files = filesList?.split(',');
    files?.forEach((url: any) => {
      let fileUrl = environment.base_api + url;
      const arr = url.split('_');
      fileName = arr[arr.length - 1]; //last word after _ in file path
      value += `<a href="${fileUrl}" target="_blank">${fileName}</a> <br>`;
    });
    return value; //list of files paths
  }

  getFileIconUrl(filePath: string): string {
    let iconUrl = 'assets/images/icons/file-icon.png';
    if (filePath.includes('.pdf')) {
      iconUrl = 'assets/images/icons/pdf-icon.png';
    } else if (
      filePath.includes('.doc') ||
      filePath.includes('.docx') ||
      filePath.includes('.rtf')
    ) {
      iconUrl = 'assets/images/icons/word-icon.png';
    } else if (
      filePath.includes('.xls') ||
      filePath.includes('.xlsx') ||
      filePath.includes('.csv')
    ) {
      iconUrl = 'assets/images/icons/excel-icon.png';
    }
    return iconUrl;
  }
  showActionById(id: number): Boolean {
    if (!this.showActionBtns) {
      return false;
    }

    const actions = this.requestBasicInfo?.actions;
    if (actions?.length > 0) {
      const showBtn = actions.find((x: any) => x == id);
      if (showBtn) {
        return true;
      }
    }
    return false;
  }

  showCancelBtn(): Boolean {
    //if submitter is current user and pending from everone
    const waitingActions = this.requestWorkflow?.filter(
      (x: any) => x.action == 'Waiting'
    );
    const alreadyCanceled = this.requestWorkflow?.find(
      (x: any) => x.action == 'Cancel'
    );
    const isRejected = this.requestWorkflow?.find(
      (x: any) => x.action == 'Reject'
    );
    const requestSubmitterID = this.requestBasicInfo?.requesterId;
    if (
      !isRejected &&
      requestSubmitterID == this.currentUser.employeeNumber &&
      !alreadyCanceled &&
      waitingActions?.length == this.requestWorkflow?.length - 2
    ) {
      //subtract 2: 1 is for submitter and 1 for LM1 action
      return true;
    } else {
      return false;
    }
  }

  onCancelRequest(): void {
    this.confirmationService.confirm({
      message: 'Are you sure to cancel this request?',
      accept: () => {
        let statusObj: any = {
          requestId: this.requestId,
          requestActionId: 16,
          // reason: 'cancel reason'
        };
        this.showRejectSpinner = true;
        this.updateRequestStatus(statusObj);
      },
    });
  }

  getRequestHistory(): void {
    const reqObj = {
      serviceId: this.requestBasicInfo?.serviceId,
      employeeNumber: this.requestBasicInfo?.requesterId,
      isSortDesc: true,
    };
    this.userService
      .getRequestHistoryData(reqObj)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          this.submitted = false;
          if (resp.isSuccessful) {
            this.requestHistory = resp.data;
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }
  getAttachmentLink(filePath: string) {
    let fileName = 'Attachment';
    let fileUrl = environment.base_api + filePath;
    const arr = filePath.split('_');
    fileName = arr[arr.length - 1]; //last word after _ in file path
    return `<a href="${fileUrl}" target="_blank">${fileName}</a> <br>`;
  }
}
