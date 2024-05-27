import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { first, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/services/auth.service';
import { TranslatorService } from 'src/services/translator.service';
import { UserService } from '../../services/user.service';
import { v4 as uuidv4 } from 'uuid';
import { OwlOptions } from 'ngx-owl-carousel-o';
import * as _ from 'lodash';
import { Title } from '@angular/platform-browser';
import { VidaService } from '../../services/vida.service';

@Component({
  selector: 'app-create-user-request',
  templateUrl: './create-user-request.component.html',
  styleUrls: ['./create-user-request.component.scss'],
})
export class CreateUserRequestComponent implements OnInit {
  requestFormData: any;
  termsAccepted = false;
  selectedWorkflowRole: any;
  isFormInvalid = false;
  showTermsConditions = false;
  serviceSteps: any[] = [];
  activeStepIndex = 0;
  applicationLang = 'en';
  showForm = false;
  todayDate = new Date();
  showSaveRequestLoader = false;
  requestForm: any = new FormGroup({});
  currentUser: any = {};
  currentServiceId = -1;
  employeeDataSpinner = false;
  showMyTeamBtn = false;
  showMyTeamBar = false;
  loaderType = 'request';
  sort = false;
  uploadedFiles: any;
  newRequestId = uuidv4();
  filteredSuggession: Array<any> = [];
  requestWorkflow: any[] = [];
  totalWorkflowData: any[] = [];
  fileUploadSpinner = false;
  groupMembersMsg = 'Select group for members';
  requestHistory: any[] = [];
  checkedValues = [];
  userManagers: any;
  customOptions: OwlOptions = {
    margin: 20,
    nav: true,
    loop: false,
    rtl: false,
    navText: [
      '<i class="fa fa-angle-left"></i>',
      '<i class="fa fa-angle-right"></i>',
    ],
    responsive: {
      0: {
        items: 1,
      },
      600: {
        items: 5,
      },
      1000: {
        items: 7,
      },
    },
    dots: false,
  };

  showRequestHistory = false;
  spinner = false;
  errorMessage = 'User Info Retrieval in process';
  wfSpinner = false;
  showCorrespondingPOSTable: boolean = false;
  noOfCorrespondingPOS: Array<any> = [];
  entities: Array<any> = [];
  selectedEntity: string | undefined;
  @ViewChild('fileInput', { static: false }) fileInput: any;
  showPOErrorMessage: boolean = false;
  itAcceptanceAcknowledge = false;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private translateService: TranslatorService,
    private titleService: Title,
    private vidaService: VidaService
  ) {
    titleService.setTitle('ITG - New Request');

    this.translateService.getCurrentLanguage().subscribe((lng: string) => {
      this.applicationLang = lng;
      if (this.applicationLang == 'ar') {
        this.customOptions['rtl'] = true;
      } else {
        this.customOptions['rtl'] = false;
      }
    });

    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.getEntities();
    this.route.queryParams.subscribe((param: any) => {
      if (param && param['serviceId']) {
        this.currentServiceId = param['serviceId'];
        this.getRequestFormFields();
        // this.getEmployeeRequestFlow();
      } else {
        this.router.navigate(['/user/dashboard']);
      }
    });
  }

  getEntities() {
    this.vidaService
      .getProjectsList()
      .pipe(first())
      .subscribe({
        next: (resp) => {
          if (resp.isSuccessful) {
            this.entities = resp.data.map((obj: any) => {
              return { name: obj.nameEn, value: obj.id };
            });
            console.log(this.entities);
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

  getRequestFormFields(): void {
    this.userService
      .getServiceFormForRequest(this.currentServiceId)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            this.requestFormData = resp.data;
            const reviewStep = {
              id: -11,
              nameAr: 'مراجعة',
              nameEn: 'Review',
              stepFields: [],
            };
            this.requestFormData['serviceSteps'].push(reviewStep);
            this.initializeRequestForm();
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        (err) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        }
      );
  }

  initializeRequestForm(): void {
    this.populateRequestSteps();
    this.populateFormFields();
    this.requestForm.patchValue(this.currentUser); //this is for filling current user information in first step of request
    this.getEmployeeInfo();
    // this.getEmployeeRequestFlow();
    this.showForm = true;
  }

  populateRequestSteps(): void {
    this.requestFormData.serviceSteps.forEach((stp: any) => {
      let stepLabel = '';
      if (this.applicationLang == 'en') {
        stepLabel = stp.nameEn;
      } else {
        stepLabel = stp.nameAr;
      }
      const serviceStep = {
        label: stepLabel,
      };
      this.serviceSteps.push(serviceStep);
    });
  }

  populateFormFields(): void {
    this.requestFormData.serviceSteps.forEach((step: any) => {
      //for steps
      step.stepFields
        .filter((x: any) => !x.hasCondition)
        .forEach((field: any) => {
          //for step's fields
          let defaultValue: any = field.defaultValue ? field.defaultValue : '';

          if (
            field.controlType == 'dropdown' ||
            field.controlType == 'radiobutton'
          ) {
            defaultValue = +defaultValue;
          }

          if (field.controlType == 'date' && field.minDate) {
            field.minDate = new Date(field.minDate);
          }

          if (field.controlType == 'date' && field.maxDate) {
            field.maxDate = new Date(field.maxDate);
          }

          if (field.isRequired) {
            this.requestForm.addControl(
              field.key,
              new FormControl(defaultValue, Validators.required)
            );
          } else {
            this.requestForm.addControl(
              field.key,
              new FormControl(defaultValue, [])
            );
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
                    field.options = resp.data;
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
          //   if (field.isRequired || field.regex) {
          //     if (field.isRequired && field.regex) {
          //       this.requestForm.addControl(field.key, new FormControl(defaultValue, [Validators.required, Validators.pattern(field.regex)]));
          //     } else if (field.isRequired && !field.regex) {
          //       this.requestForm.addControl(field.key, new FormControl(defaultValue, Validators.required));
          //     } else if (!field.isRequired && field.regex) {
          //       this.requestForm.addControl(field.key, new FormControl(defaultValue, Validators.pattern(field.regex)));
          //     }
          //   } else {
          //     this.requestForm.addControl(field.key, new FormControl(defaultValue, []));
          //   }
        });
    });
  }

  onLookUpChange(event: any, field: any) {
    if (field.hasChild && field.serviceFieldConfiguration?.length) {
      if (this.currentServiceId == 34 && field.key == 'action') {
        this.requestForm.controls.group.setValue(null);
        this.checkedValues = [];
      }
      if (this.currentServiceId == 54 && field.key == 'poType') {
        let poType = field.options.find((e: any) => e.id == event.value).nameEn;
        if (poType == 'Petty Cash') {
          this.showCorrespondingPOSTable = false;
          this.noOfCorrespondingPOS = [];
        }
      }
      for (
        let index = 0;
        index < field.serviceFieldConfiguration.length;
        index++
      ) {
        const each = field.serviceFieldConfiguration[index];
        let conditionalField = this.requestFormData?.serviceSteps[
          this.activeStepIndex
        ]?.stepFields.find((e: any) => e.id == each.fieldId);

        if (
          this.currentServiceId == 34 &&
          conditionalField.key == 'groupMembers'
        ) {
          conditionalField.options = [];
        }

        if (
          this.currentServiceId == 5 &&
          this.requestForm.value.projectCode != 'UMCBH'
        ) {
          conditionalField.hasCondition = true;
          break;
        }

        if (each.lookupDetailId == event.value) {
          let defaultValue = conditionalField.defaultValue
            ? conditionalField.defaultValue
            : '';
          if (conditionalField.isRequired) {
            this.requestForm.addControl(
              conditionalField.key,
              new FormControl(defaultValue, Validators.required)
            );
          } else {
            this.requestForm.addControl(
              conditionalField.key,
              new FormControl(defaultValue, [])
            );
          }

          conditionalField.hasCondition = false;
        } else {
          if (this.requestForm.controls[conditionalField.key]) {
            this.requestForm.removeControl(conditionalField.key);
          }
          conditionalField.hasCondition = true;
        }
        // conditionalField.hasCondition = each.lookupDetailId != event.value;
      }
    } else if (field.hasChild && this.currentServiceId == 17) {
      //dynamic reports service
      this.handleDynamicReportCase(field, event.value);
    } else if (
      (field.key == 'risRole' || field.key == 'pacRole') &&
      this.currentServiceId == 16
    ) {
      //dynamic reports service
      this.handlePacRisCase(field, event.value);
    } else if (this.currentServiceId == 34 && field.key == 'group') {
      let actionField = this.requestFormData?.serviceSteps[
        this.activeStepIndex
      ]?.stepFields.find((e: any) => e.key == 'action');
      const selectedAction = actionField.options.find(
        (x: any) => x.id == this.requestForm.value.action
      );
      if (selectedAction.nameEn.includes('Remove Users')) {
        //this.getGroupMembers(event.value);
      }
    } else if (this.currentServiceId == 54) {
      //dynamic reports service
      if (field.key == 'noOfCorrespondingPos') {
        this.noOfCorrespondingPOS = [];
        this.showCorrespondingPOSTable = true;
        let noOfPOS = +field.options.find((e: any) => e.id == event.value)
          .nameEn;
        for (let index = 0; index < noOfPOS; index++) {
          this.noOfCorrespondingPOS.push({
            correspondingPO: '',
            correspondingEntity: null,
            correspondingEntityText: null,
            attachmentUrl: '',
            deliveryNoteUrl: '',
            index: index + 1,
            showPOErrorMessage: false,
          });
        }
      }
    }
    if (field.hasWorkflow) {
      this.requestWorkflow = this.totalWorkflowData.filter(
        (x: any) => x.lookUpDetailId == event.value
      );
    }
  }

  entityChange(po: any) {
    po.correspondingEntityText = this.getEntityLabel(po.correspondingEntity);
  }

  getGroupMembers(groudId: any): void {
    this.spinner = true;
    this.userService
      .getGroupMembers(groudId)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.spinner = false;

            let gmField = this.requestFormData?.serviceSteps[
              this.activeStepIndex
            ]?.stepFields.find((e: any) => e.key == 'groupMembers');
            if (resp.data.length == 0) {
              this.groupMembersMsg = 'Selected group has no member';
              this.requestForm.controls.groupMembers.setValue([]);
              this.checkedValues = [];
            }
            resp.data = _.uniqBy(resp.data, 'emailAddress');
            gmField.options = resp.data.map((x: any) => ({
              id: x.emailAddress,
              nameEn: x.displayName,
            }));
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
            this.spinner = false;
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
          this.spinner = false;
        },
      });
  }

  handlePacRisCase(field: any, selectedValue: any): void {
    const projectField = this.requestFormData?.serviceSteps[
      this.activeStepIndex
    ]?.stepFields.find((e: any) => e.key == 'projectId');
    const selectedProject = projectField.options.find(
      (x: any) => x.id == this.requestForm.value.projectId
    );
    const wfReqObj = {
      serviceId: this.currentServiceId,
      employeeNumber: this.requestForm.value.employeeNumber,
      requestProject: selectedProject.payrollCode,
      lookUpDetailId: selectedValue,
    };

    this.userService
      .getPacRisWorkflow(wfReqObj)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.requestWorkflow = resp.data;
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

  handleDynamicReportCase(field: any, selectedValue: any): void {
    let conditionalField: any;
    if (field.key == 'projectId') {
      //selected field
      conditionalField = this.requestFormData?.serviceSteps[
        this.activeStepIndex
      ]?.stepFields.find((e: any) => e.key == 'category'); //field to unhide and fill
    } else if (field.key == 'category') {
      //selected field
      conditionalField = this.requestFormData?.serviceSteps[
        this.activeStepIndex
      ]?.stepFields.find((e: any) => e.key == 'report'); //field to unhide and fill

      const projectField = this.requestFormData?.serviceSteps[
        this.activeStepIndex
      ]?.stepFields.find((e: any) => e.key == 'projectId');
      const catField = this.requestFormData?.serviceSteps[1]?.stepFields.find(
        (e: any) => e.key == 'category'
      );
      const selectedProject = projectField.options.find(
        (x: any) => x.id == this.requestForm.value.projectId
      );
      const selectedCategory = catField.options.find(
        (x: any) => x.id == selectedValue
      );

      //this.getDynamicReportsWorkflow(selectedProject.payrollCode, selectedCategory.nameEn);
    }

    let defaultValue = conditionalField.defaultValue
      ? conditionalField.defaultValue
      : '';
    if (conditionalField.isRequired) {
      this.requestForm.addControl(
        conditionalField.key,
        new FormControl(defaultValue, Validators.required)
      );
    } else {
      this.requestForm.addControl(
        conditionalField.key,
        new FormControl(defaultValue, [])
      );
    }
    const projectField = this.requestFormData?.serviceSteps[
      this.activeStepIndex
    ]?.stepFields.find((e: any) => e.key == 'projectId'); //field to unhide and fill
    const selectedProjectId = this.requestForm.value.projectId;
    const project = projectField.options.find(
      (x: any) => x.id == selectedProjectId
    );
    const requestPayload: any = {
      payrollCode: project.payrollCode,
      requestType: conditionalField.searchApi?.requestType,
      requestUrl: conditionalField.searchApi?.requestUrl,
    };
    if (field.key == 'projectId') {
      requestPayload['employeeId'] = this.requestForm.value.employeeNumber;
    } else if (field.key == 'category') {
      requestPayload['categoryID'] = selectedValue.toString();
    }
    this.spinner = true;
    this.userService
      .callDynamicApi(requestPayload)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          this.spinner = false;

          if (resp.isSuccessful) {
            conditionalField.options = resp.data;
            conditionalField.hasCondition = false;
          } else {
            //hide category and report fields in case of access limitation for selected project
            this.hideCategoryReport();
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: () => {
          this.hideCategoryReport();

          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
          this.spinner = false;
        },
      });
  }

  getDynamicReportsWorkflow(
    selectedProject: string,
    selectedCategory: string
  ): void {
    const requestPayload = {
      projectCode: selectedProject,
      employeeNumber: this.requestForm.value.employeeNumber,
      category: selectedCategory,
    };
    this.userService
      .getDynamicReportsWorkflow(requestPayload)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.requestWorkflow = resp.data;
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

  private verifyDoctorBlockStatus() {
    this.userService
      .verifyDoctorBlockStatus(this.requestForm.value.employeeNumber)
      .subscribe((response) => {
        if (response && response.statusCode) {
          if (response.data) {
            this.requestForm.controls['type']?.setValue(100);
            this.messageService.add({
              severity: response.data ? 'error' : 'success',
              summary: this.translateService.translate.instant('blacklist'),
            });
          } else {
            this.requestForm.controls['type']?.setValue(99);
            this.messageService.add({
              severity: response.data ? 'error' : 'success',
              summary: this.translateService.translate.instant('not_blacklist'),
            });
          }
        }
      });
  }

  onNextStep(): void {
    if (
      this.currentServiceId == 54 &&
      this.activeStepIndex == 1 &&
      !this.itAcceptanceAcknowledge
    ) {
      this.isFormInvalid = true;
      this.messageService.add({
        severity: 'error',
        summary: 'Please acknowledge the corrsponding purchase orders',
        detail: '',
      });
      return;
    }
    if (this.isCurrentStepValid()) {
      this.isFormInvalid = false;

      if (
        this.activeStepIndex == this.serviceSteps!.length - 2 &&
        this.currentServiceId != 12
      ) {
        //when moving to last step
        this.getEmployeeRequestFlow();
      }

      if (this.activeStepIndex == 0 && this.currentServiceId == 42) {
        //Include/Exclude service to check doctor include status
        this.verifyDoctorBlockStatus();
      }

      if (this.activeStepIndex == 0 && this.currentServiceId == 1) {
        //reset internet access dropdown on 2nd step for filtering workflows
        this.resetInternetAccessDropdown();
      }

      if (this.validateAttachements()) {
        // check if current step has any file attachments and are they uploaded or not
        if (this.currentServiceId == 38 && this.activeStepIndex == 0) {
          //add staff/user service case
          this.verifyNewUserID();
        } else {
          this.activeStepIndex += 1;
        }
      } else {
        //
        this.confirmationService.confirm({
          message: 'Are you sure to continue without uploading files?',
          accept: () => {
            this.activeStepIndex += 1;
          },
        });
      }
    } else {
      this.isFormInvalid = true;
    }
  }

  verifyNewUserID(): void {
    const userObj = {
      employeeNumber: this.requestForm.value.employeeNumber,
      emailAddress: this.requestForm.value.emailAddress,
    };
    this.showSaveRequestLoader = true;
    this.userService
      .verifyNewUserID(userObj)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          this.showSaveRequestLoader = false;
          if (resp.data) {
            this.messageService.add({
              severity: 'error',
              summary: resp.data,
              detail: '',
            });
          } else {
            this.activeStepIndex += 1;
          }
        },
        error: () => {
          this.showSaveRequestLoader = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  resetInternetAccessDropdown(): void {
    if (this.requestForm.controls['internetAccessType']) {
      this.requestForm.controls['internetAccessType'].setValue(null);
    }
  }

  onPreviousStep(): void {
    this.activeStepIndex -= 1;
  }

  validateAttachements(): Boolean {
    let isValid = true;
    const currentStepFields =
      this.requestFormData.serviceSteps[this.activeStepIndex].stepFields;
    const attachmentFields = currentStepFields.filter(
      (x: any) => x.controlType == 'browse'
    );

    if (attachmentFields.length) {
      const formKeys = Object.keys(this.requestForm.value);
      attachmentFields.forEach((browseField: any) => {
        const isInFrom = formKeys.find((x: string) => x == browseField.key);
        if (isInFrom) {
          const fieldValue = this.requestForm.value[browseField.key];
          if (this.uploadedFiles?.length > 0 && !fieldValue) {
            //files attached but not uploaded
            isValid = false;
          }
        }
      });
    }

    return isValid;
  }

  onRequestSave(): void {
    if (this.requestForm.valid) {
      this.showSaveRequestLoader = true;
      let request = { ...this.requestForm.value };
      request['requestId'] = this.newRequestId;
      request['serviceId'] = this.currentServiceId;
      request['createdBy'] = this.currentUser.employeeNumber;

      //following condition block is temporary for saving shared folder request bcz department is coming empty from user search API
      if (this.currentServiceId == 14) {
        request.shareFolderPrivilege.forEach((userPriv: any) => {
          userPriv['department'] = 'test';
          userPriv['name'] = userPriv.displayName;
        });
      }

      if (this.currentServiceId == 17) {
        //dynamic reports
        const projectField =
          this.requestFormData?.serviceSteps[1]?.stepFields.find(
            (e: any) => e.key == 'projectId'
          );
        const catField = this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'category'
        );
        const reportField =
          this.requestFormData?.serviceSteps[1]?.stepFields.find(
            (e: any) => e.key == 'report'
          );
        const selectedProject = projectField.options.find(
          (x: any) => x.id == request.projectId
        );
        const selectedCategory = catField.options.find(
          (x: any) => x.id == request.category
        );
        const selectedReport = reportField.options.find(
          (x: any) => x.id == request.report
        );
        request['requestProject'] = selectedProject?.payrollCode;
        request['categoryName'] = selectedCategory?.nameEn;
        request['reportName'] = selectedReport?.nameEn;
      }
      if (this.currentServiceId == 16) {
        //PAC/RIS service
        const projectField =
          this.requestFormData?.serviceSteps[1]?.stepFields.find(
            (e: any) => e.key == 'projectId'
          );
        const rioSystemField =
          this.requestFormData?.serviceSteps[1]?.stepFields.find(
            (e: any) => e.key == 'rioSystem'
          );
        const risRoleField =
          this.requestFormData?.serviceSteps[1]?.stepFields.find(
            (e: any) => e.key == 'risRole'
          );
        const pacRoleField =
          this.requestFormData?.serviceSteps[1]?.stepFields.find(
            (e: any) => e.key == 'pacRole'
          );
        const selectedProject = projectField.options.find(
          (x: any) => x.id == request.projectId
        );
        const selectedSystem = rioSystemField.options.find(
          (x: any) => x.id == request.rioSystem
        );
        request['requestProject'] = selectedProject?.payrollCode;
        request['rioSystemName'] = selectedSystem?.nameEn;
        if (risRoleField && request.risRole) {
          const selectedRole = risRoleField.options.find(
            (x: any) => x.id == request.risRole
          );
          request['roleName'] = selectedRole?.nameEn;
          request['roleId'] = selectedRole?.id;
        } else if (pacRoleField && request.pacRole) {
          const selectedRole = pacRoleField.options.find(
            (x: any) => x.id == request.pacRole
          );
          request['roleName'] = selectedRole?.nameEn;
          request['roleId'] = selectedRole?.id;
        }
      }

      if (this.currentServiceId == 34) {
        //add/remove users to group
        const actionField =
          this.requestFormData.serviceSteps[1].stepFields?.find(
            (x: any) => x.key == 'action'
          );
        const groupField =
          this.requestFormData.serviceSteps[1].stepFields?.find(
            (x: any) => x.key == 'group'
          );
        if (actionField) {
          request['actionName'] = actionField.options?.find(
            (x: any) => x.id == request.action
          )?.nameEn;
        }
        if (groupField) {
          request['groupName'] = groupField.options?.find(
            (x: any) => x.id == request.group
          )?.nameEn;
        }
        if (request['users'] && request['users'].length) {
          request['users'] = request.users
            .map((x: any) => x.emailAddress.split('@')[0])
            ?.join(',');
        }

        if (request['groupMembers'] && request['groupMembers'].length) {
          //request['groupMembers'] = request.groupMembers.map((x: any) => x.split('@')[0]).join(',');
          request['groupMembers'] = request['groupMembers']
            .map((x: any) => x.displayName)
            .join();
        }
      }

      if (this.currentServiceId == 11) {
        //new email group
        if (request.recepients?.length) {
          request.recepients = request.recepients.map(
            (x: any) => x.emailAddress.split('@')[0]
          );
        }
        if (request.senders?.length) {
          request.senders = request.senders.map(
            (x: any) => x.emailAddress.split('@')[0]
          );
        }
      }

      if (request.month) {
        let addMonthDate = new Date(request.month);
        addMonthDate.setMonth(addMonthDate.getMonth() + 1);
        request.month = addMonthDate;
      }

      if (this.currentServiceId == 54) {
        //new email group
        if (this.noOfCorrespondingPOS.length) {
          request.noOfPOS = this.noOfCorrespondingPOS;
        }
      }

      const reqObj = {
        serviceId: this.currentServiceId,
        requestData: JSON.stringify(request),
      };

      this.userService
        .submitUserRequest(reqObj)
        .pipe(first())
        .subscribe(
          (resp: any) => {
            if (resp.isSuccessful) {
              this.messageService.add({
                severity: 'success',
                summary:
                  this.applicationLang == 'ar'
                    ? 'تم حفظ الطلب بنجاح'
                    : 'Request saved successfully.',
              });
              setTimeout(() => {
                this.router.navigate(['/user/myrequest']);
              }, 2000);
            } else {
              this.messageService.add({
                severity: 'error',
                summary: resp.message,
                detail: '',
              });
              this.showSaveRequestLoader = false;
            }
          },
          (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Something went wrong',
              detail: '',
            });
            this.showSaveRequestLoader = false;
          }
        );
    }
  }

  isNextButtonDisabled(): any {
    // if (this.marathonForm.invalid || (this.activeStepIndex == 0 && this.selectedProjects.length == 0)
    //   || (this.activeStepIndex == 1 && (this.selectedSponsors.length == 0 || !this.isSponsorsPrizeSelected()))
    //   || (this.activeStepIndex == 2 && this.marathonQuestions.length == 0) || this.activeStepIndex == 3) {
    //   return true;
    // } else {
    //   return false;
    // }
  }

  getToolTipMsg(): string {
    if (this.isNextButtonDisabled() && this.activeStepIndex == 0) {
      return 'Please fill all the required fields';
    } else {
      return '';
    }
  }

  isCurrentStepValid(): Boolean {
    //check whether required fileds are filled or not
    const currentStepFields =
      this.requestFormData.serviceSteps[this.activeStepIndex].stepFields;
    let isFieldValueAdded = true;

    const requiredFields = currentStepFields.filter((x: any) => x.isRequired);
    requiredFields.forEach((reqF: any) => {
      const isFieldInForm = this.requestForm.controls[reqF.key];
      if (isFieldInForm) {
        //is field control is available in form
        const fieldValue = this.requestForm.value[reqF.key];
        const validControl = this.requestForm.controls[reqF.key]?.valid;
        if (!validControl || !fieldValue || fieldValue.length == 0) {
          //If value of required field is missing
          isFieldValueAdded = false;
        }
        if (reqF.key == 'shareFolderPrivilege' && fieldValue.length) {
          const isAnyMissingAccess = fieldValue.find(
            (x: any) => !x.canRead && !x.canWrite
          );
          if (isAnyMissingAccess) {
            isFieldValueAdded = false;
            this.messageService.add({
              severity: 'warn',
              summary: 'Select atleast one access for added users',
              detail: '',
            });
          }
        }
      }
    });

    if (this.activeStepIndex == 1 && this.currentServiceId == 54) {
      //Include/Exclude service to check doctor include status
      this.noOfCorrespondingPOS.forEach((each) => {
        each.showPOErrorMessage =
          !each.correspondingPO ||
          !each.correspondingEntity ||
          !each.attachmentUrl ||
          (this.requestFormData?.serviceSteps[0]?.stepFields[
            'employeeNumber'
          ] != this.currentUser.employeeNumber
            ? !each.deliveryNoteUrl
            : false);
      });
      if (
        this.noOfCorrespondingPOS.filter((e) => e.showPOErrorMessage).length
      ) {
        isFieldValueAdded = false;
      }
    }

    if (this.errorMessage != '') {
      isFieldValueAdded = false;
      this.messageService.add({
        severity: 'error',
        summary: this.errorMessage,
      });
    }

    return isFieldValueAdded;
  }

  getSubmitTipMsg(): string {
    if (!this.termsAccepted) {
      return 'Please read and accept Terms & Conditions';
    } else {
      return '';
    }
  }

  onTextInputChange(ev: any, field: any): void {
    if (field.key == 'employeeNumber') {
      if (ev?.key == 'Enter') {
        this.getEmployeeInfo();
      } else {
        this.errorMessage = 'Invalid Employee Number';
      }
    }
  }

  getEmployeeInfo(): void {
    const employeeId = this.requestForm.value.employeeNumber;
    this.employeeDataSpinner = true;
    const empObj = {
      employeeNumber: employeeId,
      serviceId: this.currentServiceId,
    };
    this.getRequestHistory();
    this.userService
      .getEmployeeInformation(empObj)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          this.employeeDataSpinner = false;

          if (resp.isSuccessful) {
            this.errorMessage = '';

            const searchedUser = resp.data[0];
            if (searchedUser.projectCode == 'SHF') {
              this.errorMessage =
                'Executive Director for Employee Payroll Code Data Error, Please Contact Portal Admin​';
              this.messageService.add({
                severity: 'error',
                summary: this.errorMessage,
              });
              return;
            }

            this.requestForm.patchValue(resp.data[0]); // filling employee info in first step of request
            if (this.currentServiceId == 17) {
              //hide category and report field for dynamic report
              this.hideCategoryReport();
            } else if (this.currentServiceId == 12) {
              //hide category and report field for dynamic report
              this.getEmployeeManagers();
            }
            // this.getEmployeeRequestFlow();
          } else {
            this.errorMessage = resp.message;
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        (err) => {
          this.employeeDataSpinner = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        }
      );
  }

  hideCategoryReport(): void {
    //for hiding by default fields of dynamic report
    let categoryField = this.requestFormData?.serviceSteps[1]?.stepFields.find(
      (e: any) => e.key == 'category'
    );
    categoryField.options = [];
    categoryField.hasCondition = true;
    let reportField = this.requestFormData?.serviceSteps[1]?.stepFields.find(
      (e: any) => e.key == 'report'
    );
    reportField.options = [];
    reportField.hasCondition = true;
    if (this.requestForm.controls.category) {
      this.requestForm.controls.category.setValue([]);
    }
    if (this.requestForm.controls.report) {
      this.requestForm.controls.report.setValue([]);
    }
  }

  getEmployeeManagers(): void {
    //its is required to show requester managers's emails for reset password service
    const userObj = {
      serviceId: 12,
      employeeNumber: this.requestForm.value.employeeNumber,
    };
    this.userService
      .getUserManagers(userObj)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          if (resp.isSuccessful) {
            this.userManagers = resp.data;
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
            });
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong in fetching managers email',
          });
        },
      });
  }

  getFieldValueFromList(field: any, selectedValue: any): string {
    let value = '---';
    if (field && selectedValue) {
      if (
        field.controlType == 'dropdown' ||
        field.controlType == 'radiobutton'
      ) {
        const selection = field.options.find((x: any) => x.id == selectedValue);
        if (selection) {
          value =
            this.applicationLang == 'en' ? selection.nameEn : selection.nameAr;
        }
      } else if (field.controlType == 'checkbox') {
        value = '';
        selectedValue.forEach((val: any) => {
          const selection = field.options.find((x: any) => x.id == val);
          if (selection) {
            value +=
              this.applicationLang == 'en'
                ? selection.nameEn
                : selection.nameAr;
            value += ', ';
          }
        });
      } else if (field.controlType == 'date') {
        value = new Date(selectedValue).toDateString();
      } else if (field.controlType == 'month') {
        value =
          (new Date(selectedValue).getMonth() + 1).toString() +
          '/' +
          new Date(selectedValue).getFullYear().toString();
      } else if (field.controlType == 'browse' && selectedValue.length > 0) {
        //uploaded files
        value = '';
        let fileName = 'Attachment';
        selectedValue.forEach((url: string) => {
          let fileUrl = environment.base_api + url;
          const arr = url.split('_');
          fileName = arr[arr.length - 1]; //last word after _ in file path
          value += `<i class="pi pi-link"></i> <a href="${fileUrl}" target="_blank">${fileName}</a> <br>`;
        });
      } else if (field.controlType == 'search' && selectedValue) {
        // value = selectedValue.map((e: any) =>  e.emailAddress?.split('@')[0]).join();
        // value = selectedValue.map((e: any) => e.displayName).join();
        //  value =  `<p-chips [(ngModel)]=""></p-chips>`;

        let row = '';
        selectedValue.forEach((user: any) => {
          row += `<span class="cust-badge">${
            user.emailAddress?.split('@')[0]
          }</span>`;
          // rows += `<li>${user.emailAddress?.split('@')[0]}</li>`
        });

        value = `<div class="user-list">${row}</div>`;
        // value = row;
      } else if (field.controlType == 'user-access') {
        // value = selectedValue.map((e: any) => e.displayName).join();
        let rows = '';
        selectedValue.forEach((user: any) => {
          rows += `<tr> 
            <td>${user.displayName}</td>
            <td>${user.canRead ? '✔' : '❌'}</td>
            <td>${user.canWrite ? '✔' : '❌'}</td>
          </tr>`;
        });

        value = `<table class="table table-stripped role-priv-tbl"><thead><th>User</th><th>Read</th><th>Write</th></thead>
        <tbody>${rows}</tbody></table>`;
      } else {
        value = selectedValue;
      }
    }
    return value;
  }

  getPOAttachmentLink(attachmentUrl: Array<string>) {
    let fileName = 'Attachment';
    if (attachmentUrl.length == 0) return '';
    let fileUrl = environment.base_api + attachmentUrl[0];
    const arr = attachmentUrl[0].split('_');
    fileName = arr[arr.length - 1];
    return `<i class="pi pi-link"></i> <a href="${fileUrl}" target="_blank">${fileName}</a> <br>`;
  }

  getEntityLabel(value: number) {
    let entity = this.entities.find((e) => e.value == value);
    return entity ? entity.name : '';
  }

  getEmployeeRequestFlow(): void {
    let request = { ...this.requestForm.value };
    request['createdBy'] = this.currentUser.employeeNumber;
    if (this.currentServiceId == 17) {
      //dynamic reports
      const projectField =
        this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'projectId'
        );
      const catField = this.requestFormData?.serviceSteps[1]?.stepFields.find(
        (e: any) => e.key == 'category'
      );
      const reportField =
        this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'report'
        );
      const selectedProject = projectField.options.find(
        (x: any) => x.id == request.projectId
      );
      const selectedCategory = catField.options.find(
        (x: any) => x.id == request.category
      );
      const selectedReport = reportField.options.find(
        (x: any) => x.id == request.report
      );
      request['requestProject'] = selectedProject?.payrollCode;
      request['categoryName'] = selectedCategory?.nameEn;
      request['reportName'] = selectedReport?.nameEn;
    }
    if (this.currentServiceId == 16) {
      //PAC/RIS service
      const projectField =
        this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'projectId'
        );
      const rioSystemField =
        this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'rioSystem'
        );
      const risRoleField =
        this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'risRole'
        );
      const pacRoleField =
        this.requestFormData?.serviceSteps[1]?.stepFields.find(
          (e: any) => e.key == 'pacRole'
        );
      const selectedProject = projectField.options.find(
        (x: any) => x.id == request.projectId
      );
      const selectedSystem = rioSystemField.options.find(
        (x: any) => x.id == request.rioSystem
      );
      request['requestProject'] = selectedProject?.payrollCode;
      request['rioSystemName'] = selectedSystem?.nameEn;
      if (risRoleField && request.risRole) {
        const selectedRole = risRoleField.options.find(
          (x: any) => x.id == request.risRole
        );
        request['roleName'] = selectedRole?.nameEn;
        request['roleId'] = selectedRole?.id;
      } else if (pacRoleField && request.pacRole) {
        const selectedRole = pacRoleField.options.find(
          (x: any) => x.id == request.pacRole
        );
        request['roleName'] = selectedRole?.nameEn;
        request['roleId'] = selectedRole?.id;
      }
    }
    if (this.currentServiceId == 34) {
      //add/remove users to group
      const actionField = this.requestFormData.serviceSteps[1].stepFields?.find(
        (x: any) => x.key == 'action'
      );
      const groupField = this.requestFormData.serviceSteps[1].stepFields?.find(
        (x: any) => x.key == 'group'
      );
      if (actionField) {
        request['actionName'] = actionField.options?.find(
          (x: any) => x.id == request.action
        )?.nameEn;
      }
      if (groupField) {
        request['groupName'] = groupField.options?.find(
          (x: any) => x.id == request.group
        )?.nameEn;
      }
      if (request['users'] && request['users'].length) {
        request['users'] = request.users
          .map((x: any) => x.emailAddress.split('@')[0])
          ?.join(',');
      }

      if (request['groupMembers'] && request['groupMembers'].length) {
        //request['groupMembers'] = request.groupMembers.map((x: any) => x.split('@')[0]).join(',');
        request['groupMembers'] = request['groupMembers']
          .map((x: any) => x.displayName)
          .join();
      }
    }

    if (this.currentServiceId == 11) {
      //new email group
      if (request.recepients?.length) {
        request.recepients = request.recepients.map(
          (x: any) => x.emailAddress.split('@')[0]
        );
      }
      if (request.senders?.length) {
        request.senders = request.senders.map(
          (x: any) => x.emailAddress.split('@')[0]
        );
      }
    }

    const empServObj = {
      serviceId: +this.currentServiceId,
      requestData: JSON.stringify(request),
    };
    this.wfSpinner = true;
    this.userService
      .getWorkflow(empServObj)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          let sortOrder = 1;
          if (resp.isSuccessful) {
            this.wfSpinner = false;
            this.errorMessage = '';
            this.totalWorkflowData = resp.data;
            this.requestWorkflow = resp.data;

            if (this.currentServiceId == 42) {
              //include/exclude service
              const medicalRole = this.requestWorkflow.find(
                (x: any) => x.roleNameEn == 'Medical Administrator'
              );
              if (!medicalRole) {
                //this request should be created for only users that have medical admin role
                this.errorMessage =
                  this.translateService.translate.instant('no_medical_role');
                this.messageService.add({
                  severity: 'error',
                  summary:
                    this.translateService.translate.instant('no_medical_role'),
                });
              }
            }

            if (this.currentServiceId == 51) {
              //timesheet request
              const iTAcceptRole = this.requestWorkflow.find(
                (x: any) => x.roleNameEn == 'IT Acceptance'
              );
              if (!iTAcceptRole.users || iTAcceptRole.users.length == 0) {
                //if current user's IT acceptance manager is not in DB , block him from creating request
                this.errorMessage = 'IT Manager not added';
                this.messageService.add({
                  severity: 'error',
                  summary:
                    this.translateService.translate.instant('no_it_manager'),
                });
              }
            }
          } else {
            this.errorMessage = resp.message;
            this.wfSpinner = false;

            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        (err: any) => {
          this.wfSpinner = false;

          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        }
      );
  }

  getfileFullUrl(fileUrl: string): string {
    return environment.base_api + fileUrl;
  }
  onFileSelection(ev: any): void {
    this.uploadedFiles = ev.currentFiles; //total files
    // for(let i = 0; i < ev.files.length ; i++){
    //   if(ev.files[i].size > 5000000){//greater than 5mb
    //     this.messageService.add({ severity: 'error', summary: "File Size Exceeds 5mb limit", detail: `'${ev.files[i].name}' exceeds 5mb limit. Please compress it and retry.` });
    //   }
    // }
    //ev.files; //last uploaded files
  }

  getMinDate(field: any): Date {
    if (field.minDate) {
      return new Date(field.minDate);
    } else {
      return this.todayDate;
    }
  }

  getMaxDate(field: any): Date {
    if (field.maxDate) {
      return new Date(field.maxDate);
    } else {
      return this.todayDate;
    }
  }

  onFileRemove(file: any): void {}

  onFileUpload(ev: any, field: any): void {
    this.fileUploadSpinner = true;
    this.userService
      .uploadFiles(
        field.selectionType == 2 ? ev.files : ev.currentFiles,
        this.newRequestId
      )
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            let uploadedFiles = this.requestForm.value[field.key];
            uploadedFiles = [...uploadedFiles, ...resp.data];
            this.requestForm.controls[field.key]?.setValue(uploadedFiles);
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

  onPOFileUpload(ev: any, po: any, key: string): void {
    this.fileUploadSpinner = true;
    this.userService
      .uploadFiles(ev.currentFiles, this.newRequestId)
      .pipe(first())
      .subscribe(
        (resp: any) => {
          if (resp.isSuccessful) {
            po[key] = resp.data;
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

  onEmployeeSelection(member: any): void {
    this.requestForm.patchValue(member);
  }

  searchFilter(event: any, field: any) {
    if (field.searchApi.requestUrl == 'AD/ADGroupMembers/{search}') {
      if (event.query && event.query.length >= 3) {
        const url = field.searchApi.requestUrl.replace('{search}', event.query);
        this.userService.searchGroupMembers(url).subscribe(
          (response: any) => {
            if (response.data) {
              this.filteredSuggession = response.data;
            } else {
              this.filteredSuggession = [];
            }
          },
          (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Something went wrong',
              detail: '',
            });
          }
        );
      }
    } else {
      let params: any = {};
      field.searchApi.requestParams.split(',').forEach((each: string) => {
        params[each] = event.query;
      });
      params['department'] = this.requestForm.value.department;
      this.userService
        .searchFromField(field.searchApi.requestUrl, params)
        .subscribe(
          (response) => {
            if (response.data) {
              this.filteredSuggession = response.data;
            } else {
              this.filteredSuggession = [];
            }
          },
          (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Something went wrong',
              detail: '',
            });
          }
        );
    }
  }

  getRequestHistory(): void {
    const reqObj = {
      serviceId: this.currentServiceId,
      employeeNumber: this.requestForm.value.employeeNumber,
      isSortDesc: true,
    };
    this.showSaveRequestLoader = true;
    this.userService
      .getRequestHistoryData(reqObj)
      .pipe(first())
      .subscribe({
        next: (resp: any) => {
          this.showSaveRequestLoader = false;
          if (resp.isSuccessful) {
            this.requestHistory = resp.data;
            //this.showRequestHistory = true;
          } else {
            this.messageService.add({
              severity: 'error',
              summary: resp.message,
              detail: '',
            });
          }
        },
        error: () => {
          this.showSaveRequestLoader = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Something went wrong',
            detail: '',
          });
        },
      });
  }

  getAttachmentInfo(field: any, selectedValue: any): string {
    let value = '';
    if (field.controlType == 'browse' && selectedValue.length > 0) {
      //uploaded files
      let fileName = 'Attachment';
      selectedValue.forEach((url: string) => {
        let fileUrl = environment.base_api + url;
        const arr = url.split('_');
        fileName = arr[arr.length - 1]; //last word after _ in file path

        if (
          fileName?.toLowerCase().includes('.jpeg') ||
          fileName?.toLowerCase().includes('.jpg') ||
          fileName?.toLowerCase().includes('.png')
        ) {
          value += `<i class="pi pi-link"></i> <a href="${fileUrl}" target="_blank">${fileName}</a> &nbsp;&nbsp; <img src="${fileUrl}" alt="${fileName}" width="50px" /> 
          <i class="pi pi-trash" (click)="onDeleteFile(${url})"></i>  <hr>`;
        } else {
          value += `<i class="pi pi-link"></i> <a href="${fileUrl}" target="_blank">${fileName}</a>
           <i class="pi pi-trash" (click)="onDeleteFile(${url})"></i>  <hr>`;
        }
      });
    }
    return value;
  }

  getSingleAttachmentInfo(field: any, attachmentUrl: any): string {
    let value = '';
    if (field.controlType == 'browse' && attachmentUrl) {
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

  onHistorySideClose(ev: any): void {
    this.showRequestHistory = false;
  }

  onMonthSelection(ev: any, field: any): void {
    // let addMonthDate = new Date(this.requestForm.value[field.key]);
    // addMonthDate.setMonth(addMonthDate.getMonth() + 0.5);
    // this.requestForm.controls[field.key].setValue(addMonthDate);
  }

  onDeleteFile(field: any, filePath: string): void {
    this.confirmationService.confirm({
      message: this.translateService.translate.instant('delete_msg'),
      accept: () => {
        this.userService
          .removeFile(filePath)
          .pipe(first())
          .subscribe({
            next: (resp: any) => {
              if (resp.isSuccessful) {
                let prevAttachedFiles = this.requestForm.value[field.key];
                const index = prevAttachedFiles.indexOf(filePath);
                if (index != -1) {
                  prevAttachedFiles.splice(index, 1);
                  this.requestForm.controls[field.key].setValue(
                    prevAttachedFiles
                  );
                }
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
}
